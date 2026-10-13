// Rodada 29 (ARTE) — FACHADAS dos lugares do mundo da música (32×32), no estilo antigo de art.ts/icons.ts: céu
// pontilhado, prédio em 2–3 tons com contorno escuro quente de 1 px, detalhes de época. Tipos: casa de shows (clube,
// teatro, arena, estádio), estúdio, rádio, TV, loja de discos, fábrica de prensagem, sede de gravadora, tribunal e
// escritório. Também o ÍCONE de plataforma de streaming (aplicativo) e a PLACA da casa de shows (64×16: tabuleta
// pintada → marquise de lâmpadas → neon → caixa luminosa → LED, pela época).
// Tudo PURO e semeado (id + ano): a mesma entrada sempre dá os mesmos pixels. <img> memorizado em pxImg28.

import { drawText, fitText, textWidth } from './font';
import { C, Px, dith, hsl, mix, noise, shade, withAlpha, type Col } from './px';
import { K28 as K, OUT28, bevel, h28, pxImg28, rng28 } from './art28kit';
import { relicBand28 } from './relic28';
import { region27, type Reg27 } from './skyline27';
import type { Rng } from '../../core/rng';

export type Place29 = 'club' | 'theater' | 'arena' | 'stadium' | 'studio' | 'radio' | 'tv' | 'store' | 'plant' | 'label' | 'court' | 'office' | 'bar';
export const PLACES29: Place29[] = ['club', 'theater', 'arena', 'stadium', 'studio', 'radio', 'tv', 'store', 'plant', 'label', 'court', 'office', 'bar'];

/** Tamanho da casa → tipo de fachada (capacidade em pessoas). */
export function venueKind29(cap: number, name = ''): Place29 {
  const n = name.toLowerCase();
  if (/stadium|estádio|estadio|arena|bowl|dome|field|park/.test(n) && cap >= 8000) return cap >= 30000 ? 'stadium' : 'arena';
  if (/bar|pub|caf[eé]|tavern|boteco|lounge|inn/.test(n) && cap < 400) return 'bar';
  if (/theat|teatro|hall|opera|palace|palácio|palladium|apollo|olympia|carnegie|music hall/.test(n)) return 'theater';
  if (cap >= 30000) return 'stadium';
  if (cap >= 6000) return 'arena';
  if (cap >= 1200) return 'theater';
  return 'club';
}

/** Material da parede pela região da cidade e época. */
type Mat = 'brick' | 'stucco' | 'stone' | 'concrete' | 'glass' | 'wood' | 'adobe' | 'panel';
function matOf(reg: Reg27 | '', band: number, r: Rng): Mat {
  if (band >= 4 && r.chance(0.45)) return r.pick(['glass', 'panel', 'concrete'] as Mat[]);
  switch (reg) {
    case 'uk': case 'nordic': case 'east': return r.pick(band >= 3 ? ['brick', 'concrete'] : ['brick', 'brick', 'stone']);
    case 'us': return r.pick(band >= 3 ? ['brick', 'concrete', 'glass'] : ['brick', 'stone', 'wood']);
    case 'br': case 'latam': case 'carib': case 'med': return r.pick(['stucco', 'stucco', band >= 3 ? 'concrete' : 'stone']);
    case 'mena': case 'south': case 'africa': return r.pick(['adobe', 'stucco', band >= 3 ? 'concrete' : 'adobe']);
    case 'asia': return r.pick(band >= 2 ? ['panel', 'concrete', 'glass'] : ['wood', 'stone']);
    default: return r.pick(['brick', 'stucco', 'stone', band >= 3 ? 'concrete' : 'brick']);
  }
}
const MAT: Record<Mat, Col> = {
  brick: C('#a84a34'), stucco: C('#e8d4a8'), stone: C('#b8ac98'), concrete: C('#a0a0a4'), glass: C('#4a7aa8'), wood: C('#9a6a3c'), adobe: C('#d0965c'), panel: C('#d8dce4'),
};

/** Parede com textura do material. */
function wall(p: Px, x: number, y: number, w: number, hh: number, m: Mat, base: Col, seed: number): void {
  bevel(p, x, y, w, hh, base, 0.16);
  const dk = shade(base, -0.22), lt = shade(base, 0.18);
  for (let j = y + 1; j < y + hh - 1; j++) for (let i = x + 1; i < x + w - 1; i++) {
    switch (m) {
      case 'brick': if (j % 3 === 0 || (i + (Math.floor(j / 3) % 2) * 2) % 5 === 0 && j % 3 !== 0 && noise(i, j, seed) < 0.55) p.put(i, j, dk); break;
      case 'stone': if (j % 4 === 0 || (i + (Math.floor(j / 4) % 2) * 3) % 7 === 0) p.put(i, j, dk); break;
      case 'stucco': case 'adobe': if (noise(i, j, seed) < 0.08) p.put(i, j, dk); else if (noise(i, j, seed + 1) < 0.05) p.put(i, j, lt); break;
      case 'wood': if (i % 3 === 0) p.put(i, j, dk); break;
      case 'concrete': if (j % 6 === 0) p.put(i, j, dk); break;
      case 'glass': if ((i + j) % 9 === 0) p.put(i, j, lt); else if (i % 4 === 0 || j % 4 === 0) p.put(i, j, dk); break;
      case 'panel': if (i % 6 === 0) p.put(i, j, dk); break;
    }
  }
}

/** Céu de fundo: dia (até a era do rádio) ou anoitecer (casas de show, letreiros acesos). */
function sky(p: Px, night: boolean, hue: number): void {
  const a = night ? hsl(235 + (hue % 30), 45, 16) : hsl(205, 55, 72);
  const b = night ? hsl(285, 45, 30) : hsl(200, 50, 84);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) p.put(x, y, dith(x, y, y / p.h) ? b : a);
  if (night) for (let i = 0; i < 6; i++) p.put((hue * (i + 3) * 7) % p.w, (hue * (i + 1) * 3) % 12, withAlpha(K.white, 200));
}

function windows(p: Px, x0: number, y0: number, cols: number, rows: number, dx: number, dy: number, lit: Col, dark: Col, seed: number, w = 2, hh = 2): void {
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) p.rect(x0 + i * dx, y0 + j * dy, w, hh, noise(i, j, seed) < 0.55 ? lit : dark);
}

function door(p: Px, x: number, y: number, w: number, hh: number, c: Col): void {
  p.rect(x, y, w, hh, c); p.vline(x + (w >> 1), y, y + hh - 1, shade(c, -0.35)); p.hline(x, x + w - 1, y, shade(c, 0.25));
}

/** Letreiro pequeno com texto (fitText) centrado. */
function plate(p: Px, x: number, y: number, w: number, bg: Col, fg: Col, t: string): void {
  p.rect(x, y, w, 7, bg); p.hline(x, x + w - 1, y, shade(bg, 0.25)); p.hline(x, x + w - 1, y + 6, shade(bg, -0.35));
  const tt = fitText(t, w - 2);
  drawText(p, tt, x + Math.round((w - textWidth(tt)) / 2), y + 1, fg);
}

const initials = (name: string): string => {
  const w = name.replace(/^(The|Os|As|O|A|Los|Las|Les|Le|La|El)\s+/i, '').split(/[\s&\-]+/).filter(Boolean);
  if (!w.length) return '?';
  return w.length === 1 ? w[0].slice(0, 3).toUpperCase() : w.slice(0, 3).map((x) => x[0]).join('').toUpperCase();
};

interface Ctx { p: Px; r: Rng; band: number; reg: Reg27 | ''; hue: number; seed: number; name: string; year: number }

const BULB = C('#fff2b0');
const NEON = (hue: number) => hsl(hue, 95, 64);

const DRAW: Record<Place29, (c: Ctx) => void> = {
  club: ({ p, r, band, reg, hue, seed, name }) => {
    sky(p, true, hue);
    const m = matOf(reg, band, r);
    wall(p, 3, 8, 26, 24, m, MAT[m], seed);
    p.rect(3, 6, 26, 2, shade(MAT[m], -0.3));
    // letreiro vertical ou de bandeira
    const sc = band <= 1 ? K.cream : NEON(hue);
    if (band >= 2) { p.rect(22, 2, 5, 18, K.ink); for (let y = 3; y < 19; y += 2) p.hline(23, 25, y, (y >> 1) % 2 ? sc : shade(sc, -0.3)); }
    else plate(p, 6, 10, 20, C('#3a2418'), sc, initials(name));
    door(p, 7, 23, 6, 9, C('#2a1a20'));
    p.rect(15, 21, 5, 7, K.cream); p.rect(16, 22, 3, 3, hsl(hue + 120, 70, 50)); // cartaz na parede
    // fila na porta
    for (let i = 0; i < 3; i++) { const fx = 1 + i * 2; p.disc(fx + 0.5, 26, 1, C('#1e1a1c')); p.rect(fx, 27, 2, 5, C('#1e1a1c')); }
    if (band >= 2) p.rect(7, 21, 6, 1, NEON(hue + 160));
  },
  bar: ({ p, r, band, reg, hue, seed, name }) => {
    sky(p, true, hue);
    const m = matOf(reg, band, r);
    wall(p, 2, 10, 28, 22, m, MAT[m], seed);
    // toldo listrado
    for (let x = 1; x < 31; x++) for (let y = 13; y < 17; y++) p.put(x, y, (x >> 1) % 2 ? K.cream : hsl(hue, 60, 42));
    p.hline(1, 30, 17, shade(hsl(hue, 60, 42), -0.4));
    plate(p, 5, 3, 22, C('#2a1a12'), band >= 2 ? NEON(hue + 40) : K.gold, fitText(name, 20) ? initials(name) : 'BAR');
    p.rect(4, 19, 12, 8, C('#ffd88a')); for (let x = 5; x < 15; x += 3) { p.disc(x + 1, 23, 1, C('#3a2418')); p.rect(x, 24, 2, 3, C('#3a2418')); }
    door(p, 20, 21, 6, 11, C('#5e3a1e'));
    p.put(24, 26, K.gold);
  },
  theater: ({ p, r, band, reg, hue, seed, name }) => {
    sky(p, band >= 2, hue);
    const m = band <= 1 ? 'stone' : matOf(reg, band, r);
    wall(p, 2, 4, 28, 28, m, MAT[m], seed);
    // frontão / platibanda decorada
    p.rect(2, 2, 28, 3, shade(MAT[m], 0.15)); p.disc(16, 3, 3, shade(MAT[m], 0.15));
    windows(p, 5, 7, 6, 1, 4, 0, C('#ffe8a0'), C('#3a3040'), seed, 2, 4);
    // marquise com lâmpadas
    p.rect(1, 14, 30, 7, band >= 4 ? K.ink : C('#e8dcc0'));
    if (band <= 3) for (let x = 2; x < 30; x += 2) { p.put(x, 14, BULB); p.put(x, 20, BULB); }
    const tt = fitText(name.toUpperCase(), 26);
    drawText(p, tt, 16 - Math.round(textWidth(tt) / 2), 15, band >= 4 ? NEON(hue) : C('#2a1a20'));
    p.rect(1, 21, 30, 1, C('#3a2a30'));
    for (const dx of [5, 13, 21]) door(p, dx, 24, 6, 8, C('#6e2e20'));
    p.rect(13, 22, 6, 1, K.gold);
  },
  arena: ({ p, band, hue, seed }) => {
    sky(p, true, hue);
    // cúpula
    const roof = band >= 4 ? C('#d8dce4') : C('#a0a0a4');
    p.ellipse(16, 18, 15, 9, roof);
    for (let x = 2; x < 31; x += 4) p.line(16, 9, x, 18, shade(roof, -0.15));
    p.rect(1, 18, 30, 14, C('#8a8e98')); p.hline(1, 30, 18, shade(C('#8a8e98'), 0.3));
    windows(p, 3, 21, 7, 1, 4, 0, C('#ffe8a0'), C('#404050'), seed, 3, 2);
    // telão / letreiro
    p.rect(9, 25, 14, 5, K.ink); for (let x = 10; x < 22; x++) for (let y = 26; y < 29; y++) if (dith(x, y, 0.5)) p.put(x, y, band >= 3 ? NEON(hue + x * 6) : C('#ffd060'));
    for (const lx of [3, 28]) { p.vline(lx, 2, 17, K.dgrey); p.rect(lx - 1, 1, 3, 2, BULB); }
  },
  stadium: ({ p, band, hue, seed }) => {
    sky(p, true, hue);
    // torres de luz + feixes
    for (const lx of [3, 28]) { p.poly([[lx - 1, 3], [lx + 2, 3], [16 + (lx - 16) * 0.2 + 4, 20], [16 + (lx - 16) * 0.2 - 4, 20]], withAlpha(BULB, 50)); p.vline(lx, 3, 22, K.dgrey); p.rect(lx - 2, 1, 5, 3, BULB); }
    // arquibancada (anel)
    p.ellipse(16, 23, 15, 7, C('#9a9aa0'));
    p.ellipse(16, 23, 11, 4.5, band >= 3 ? C('#3a8a4a') : C('#4a9a52'));
    for (let x = 2; x < 31; x++) for (let y = 17; y < 30; y++) { const d = ((x - 16) / 15) ** 2 + ((y - 23) / 7) ** 2; const di = ((x - 16) / 11) ** 2 + ((y - 23) / 4.5) ** 2; if (d <= 1 && di > 1 && noise(x, y, seed) < 0.5) p.put(x, y, hsl(hue + (x * 37) % 120, 60, 55)); }
    // palco
    p.rect(13, 21, 6, 3, C('#1e1a1c')); p.hline(13, 18, 21, NEON(hue));
    p.rect(0, 30, 32, 2, C('#5c5856'));
  },
  studio: ({ p, r, band, reg, hue, seed, name }) => {
    sky(p, false, hue);
    const m = band >= 4 ? r.pick(['glass', 'panel'] as Mat[]) : band >= 2 ? r.pick(['brick', 'concrete', 'stucco'] as Mat[]) : matOf(reg, band, r);
    wall(p, 3, 7, 26, 25, m, MAT[m], seed);
    p.rect(2, 5, 28, 3, shade(MAT[m], -0.35));
    windows(p, 6, 11, 3, 1, 8, 0, C('#c8e0f0'), C('#405060'), seed, 4, 4);
    // luz "gravando"
    p.rect(10, 18, 12, 5, K.ink); drawText(p, band <= 1 ? 'REC' : band >= 4 ? 'LIVE' : 'REC', band >= 4 ? 11 : 12, 18, C('#ff4040')); p.put(10, 18, C('#ff8080'));
    door(p, 13, 24, 6, 8, band >= 3 ? C('#2a2a30') : C('#6e4426'));
    plate(p, 4, 0, 24, K.ink, K.cream, initials(name));
    // antena/parabólica ou gaiola de ar condicionado
    if (band >= 3) { p.rect(24, 3, 4, 2, K.grey); p.hline(24, 27, 3, K.lgrey); }
  },
  radio: ({ p, r, band, reg, hue, seed, name }) => {
    sky(p, false, hue);
    // torre de transmissão em treliça
    for (let y = 1; y < 22; y++) { const hw = 1 + (y >> 3); p.put(24 - hw, y, K.dred); p.put(24 + hw, y, K.dred); if (y % 3 === 0) p.hline(24 - hw, 24 + hw, y, y % 6 ? K.white : K.dred); }
    p.put(24, 0, C('#ff4040'));
    for (const rr of [3, 5]) for (let a = -0.9; a < 0.9; a += 0.25) p.put(Math.round(24 + Math.cos(a - Math.PI / 2) * rr * 1.3), Math.round(2 + Math.sin(a - Math.PI / 2) * rr * 0.6 + rr), withAlpha(K.yellow, 200));
    const m = matOf(reg, band, r);
    wall(p, 2, 14, 20, 18, m, MAT[m], seed);
    windows(p, 4, 17, 4, 1, 4, 0, C('#ffe8a0'), C('#403a40'), seed, 2, 3);
    p.rect(4, 23, 14, 5, K.ink); drawText(p, band <= 1 ? 'AM' : band <= 3 ? 'FM' : 'ON', band <= 3 ? 8 : 8, 23, C('#ff4848'));
    plate(p, 2, 7, 20, hsl(hue, 55, 40), K.white, initials(name));
    door(p, 8, 28, 6, 4, C('#5e3a1e'));
  },
  tv: ({ p, r, band, reg, hue, seed, name }) => {
    sky(p, band >= 3, hue);
    const m = band >= 3 ? r.pick(['glass', 'concrete', 'panel'] as Mat[]) : matOf(reg, band, r);
    wall(p, 2, 10, 28, 22, m, MAT[m], seed);
    // antena / parabólicas
    if (band <= 2) { p.vline(8, 1, 9, K.dgrey); p.hline(5, 11, 3, K.dgrey); p.hline(6, 10, 5, K.dgrey); }
    else for (const [dx, rr] of [[7, 4], [14, 3]] as const) { p.disc(dx, 7, rr, K.lgrey); p.disc(dx + 1, 7, rr - 1.4, K.white); p.line(dx, 7, dx + 2, 4, K.dgrey); }
    // tela gigante na fachada
    p.rect(17, 2, 12, 9, K.ink);
    for (let y = 3; y < 10; y++) for (let x = 18; x < 28; x++) p.put(x, y, band <= 1 ? (dith(x, y, 0.5) ? C('#a8b0a8') : C('#606860')) : band === 2 ? hsl(hue + x * 12, 60, 55) : hsl(hue + y * 20, 80, 60));
    p.rect(21, 11, 4, 1, K.dgrey);
    windows(p, 4, 13, 6, 2, 4, 5, C('#c8e0f0'), C('#405060'), seed, 2, 3);
    plate(p, 5, 24, 22, K.ink, K.white, initials(name));
    door(p, 13, 31, 6, 1, K.ink);
  },
  store: ({ p, r, band, reg, hue, seed, name }) => {
    sky(p, false, hue);
    const m = matOf(reg, band, r);
    wall(p, 1, 2, 30, 30, m, MAT[m], seed);
    windows(p, 4, 4, 4, 1, 7, 0, C('#c8e0f0'), C('#405060'), seed, 4, 4);
    plate(p, 2, 10, 28, band >= 3 ? K.ink : C('#3a2418'), band >= 2 ? NEON(hue) : K.gold, initials(name) === '?' ? 'DISCOS' : initials(name));
    // toldo listrado
    for (let x = 1; x < 31; x++) for (let y = 17; y < 20; y++) p.put(x, y, (x >> 1) % 2 ? K.cream : hsl(hue, 65, 45));
    // vitrine com discos (78 → LP → CD → vinil de volta)
    p.rect(3, 20, 17, 11, C('#c8e0f0'));
    for (let i = 0; i < 3; i++) {
      const dx = 4 + i * 5;
      if (band === 3 && i !== 1) { p.rect(dx, 23, 4, 4, hsl(hue + i * 70, 60, 55)); p.disc(dx + 2, 25, 1.5, K.silver); }
      else { p.rect(dx, 22, 4, 5, hsl(hue + i * 70, 60, 55)); p.disc(dx + 2, 24.5, 1.2, K.ink); }
    }
    p.hline(3, 19, 28, C('#9a6a3c'));
    door(p, 22, 21, 7, 11, C('#2c5a7a'));
    p.put(23, 26, K.gold);
  },
  plant: ({ p, r, band, seed, hue }) => {
    sky(p, false, hue);
    // fumaça
    for (let i = 0; i < 6; i++) p.disc(6 + i * 1.5, 6 - i, 1.5 + i * 0.4, withAlpha(K.lgrey, 200 - i * 25));
    p.rect(4, 6, 4, 14, C('#8a3a2a')); p.hline(4, 7, 6, C('#5a2018')); p.hline(4, 7, 9, K.cream);
    // galpão de telhado em serra (shed)
    const wallC = band >= 3 ? C('#b8b8bc') : C('#a84a34');
    wall(p, 1, 16, 30, 16, band >= 3 ? 'panel' : 'brick', wallC, seed);
    for (let k = 0; k < 4; k++) { const x0 = 2 + k * 7; p.poly([[x0, 16], [x0 + 6, 11], [x0 + 6, 16]], band >= 3 ? K.lgrey : C('#5c5856')); p.vline(x0 + 6, 11, 15, C('#c8e0f0')); }
    // discos saindo
    p.rect(12, 22, 16, 8, C('#2a2628'));
    for (let i = 0; i < 4; i++) { const cx = 14 + i * 4; p.disc(cx, 26, 1.8, band === 3 ? K.silver : K.black); p.put(cx, 26, hsl(hue + i * 60, 70, 55)); }
    door(p, 3, 24, 6, 8, C('#4a4a50'));
    if (r.chance(0.5)) p.rect(28, 13, 3, 3, C('#e0b030'));
  },
  label: ({ p, r, band, reg, hue, seed, name }) => {
    sky(p, false, hue);
    const tall = band >= 1;
    if (band <= 1) {
      // torre art déco escalonada
      const m: Mat = 'stone';
      wall(p, 6, 8, 20, 24, m, MAT.stone, seed); wall(p, 9, 4, 14, 4, m, MAT.stone, seed); wall(p, 12, 1, 8, 3, m, MAT.stone, seed);
      for (let x = 8; x < 25; x += 3) p.vline(x, 9, 30, shade(MAT.stone, -0.25));
      windows(p, 9, 10, 5, 4, 3, 4, C('#ffe8a0'), C('#403a40'), seed, 1, 2);
    } else if (band <= 2) {
      const m = matOf(reg, band, r);
      wall(p, 4, 6, 24, 26, m === 'glass' ? 'concrete' : m, MAT[m === 'glass' ? 'concrete' : m], seed);
      for (let y = 8; y < 28; y += 4) p.hline(5, 26, y, C('#405870'));
      windows(p, 6, 9, 5, 5, 4, 4, C('#c8e0f0'), C('#405060'), seed, 3, 2);
    } else {
      // torre de vidro
      const g = band >= 4 ? C('#3a8ab0') : C('#4a6a98');
      p.poly([[5, 32], [5, 4], [22, 1], [27, 3], [27, 32]], g);
      for (let y = 4; y < 32; y += 2) for (let x = 6; x < 27; x++) if ((x + y) % 7 === 0 || y % 4 === 0) p.put(x, y, shade(g, (x + y) % 7 === 0 ? 0.35 : -0.15));
      p.poly([[5, 4], [12, 2.5], [12, 32], [5, 32]], withAlpha(K.white, 40));
      void tall;
    }
    plate(p, 7, 24, 18, hsl(hue, 60, 38), K.white, initials(name));
    door(p, 13, 31, 6, 1, K.ink);
  },
  court: ({ p, seed, hue }) => {
    sky(p, false, hue);
    const st = C('#e8e0cc');
    p.poly([[2, 10], [16, 2], [30, 10]], st); p.poly([[5, 9], [16, 4], [27, 9]], shade(st, -0.12));
    p.rect(2, 10, 28, 2, shade(st, -0.2));
    for (let x = 4; x < 29; x += 5) { p.rect(x, 12, 3, 15, st); p.vline(x + 2, 12, 26, shade(st, -0.18)); p.vline(x, 12, 26, shade(st, 0.12)); }
    p.rect(1, 27, 30, 2, shade(st, -0.2)); p.rect(0, 29, 32, 3, shade(st, -0.3));
    // balança
    p.vline(16, 5, 8, K.dgold); p.hline(13, 19, 5, K.dgold); p.put(13, 7, K.gold); p.put(19, 7, K.gold);
    void seed;
  },
  office: ({ p, r, band, reg, hue, seed, name }) => {
    sky(p, false, hue);
    const m = matOf(reg, band, r);
    wall(p, 4, 4, 24, 28, m, MAT[m], seed);
    windows(p, 6, 6, 5, 5, 4, 4, C('#c8e0f0'), C('#405060'), seed, 3, 2);
    plate(p, 6, 25, 20, K.ink, K.cream, initials(name));
  },
};

/** Fachada 32×32 de um lugar. `city` dá o material pela região; `year` dá a época. */
export function placePx29(kind: Place29, id: string, name: string, year: number, city = ''): Px {
  const p = new Px(32, 32);
  const r = rng28('place29', kind, id);
  const reg = city ? region27(city) : '';
  DRAW[kind]({ p, r, band: relicBand28(year), reg, hue: h28('pl29h', id) % 360, seed: h28('pl29s', id) & 0xffff, name, year });
  p.outline(OUT28);
  return p;
}

export function placeImg29(kind: Place29, id: string, name: string, year: number, city = '', size = 32): HTMLImageElement {
  return pxImg28(`pl29:${kind}:${id}:${relicBand28(year)}:${city}`, () => placePx29(kind, id, name, year, city), size, size, { cls: 'place29', title: name });
}

// ---------------------------------------------------------------- streaming (ícone de aplicativo)

const APP_GLYPHS = ['play', 'wave', 'note', 'rings', 'bars', 'drop', 'heart', 'bolt'] as const;
export type AppGlyph29 = (typeof APP_GLYPHS)[number];

/** Ícone 24×24 de plataforma (aplicativo de cantos redondos). Pelo nome: cor e símbolo. */
export function appIconPx29(name: string, year = 2015): Px {
  const N = 24;
  const p = new Px(N, N);
  const hue = h28('app29', name) % 360;
  const g = APP_GLYPHS[h28('appg29', name) % APP_GLYPHS.length];
  const flat = year >= 2013;
  const bg = hsl(hue, 70, flat ? 46 : 40), bg2 = hsl(hue + 30, 75, 58);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const cx = Math.max(0, Math.abs(x + 0.5 - 12) - 7), cy = Math.max(0, Math.abs(y + 0.5 - 12) - 7);
    if (cx * cx + cy * cy > 20) continue;
    p.put(x, y, flat ? bg : dith(x, y, y / N) ? bg2 : bg);
  }
  if (!flat) for (let y = 1; y < 10; y++) for (let x = 2; x < 22; x++) if (p.get(x, y)) p.put(x, y, mix(p.get(x, y), K.white, 0.25));
  const fg = K.white;
  switch (g) {
    case 'play': p.poly([[8, 6], [18, 12], [8, 18]], fg); break;
    case 'wave': for (let x = 4; x < 20; x++) { const hh = Math.round(Math.abs(Math.sin(x * 0.7)) * 6) + 1; p.vline(x, 12 - hh, 12 + hh, x % 2 ? fg : withAlpha(fg, 160)); } break;
    case 'note': p.disc(8, 16, 3, fg); p.vline(10, 5, 16, fg); p.disc(16, 14, 3, fg); p.vline(18, 4, 14, fg); p.rect(10, 4, 9, 3, fg); break;
    case 'rings': p.ring(12, 12, 7, fg); p.ring(12, 12, 4, fg); p.disc(12, 12, 1.5, fg); break;
    case 'bars': for (let i = 0; i < 4; i++) p.rect(5 + i * 4, 18 - (i + 1) * 3, 3, (i + 1) * 3, fg); break;
    case 'drop': p.disc(12, 14, 5, fg); p.poly([[8, 12], [12, 4], [16, 12]], fg); p.put(10, 13, bg); break;
    case 'heart': p.disc(9, 10, 3.5, fg); p.disc(15, 10, 3.5, fg); p.poly([[5.5, 11], [18.5, 11], [12, 19]], fg); break;
    case 'bolt': p.poly([[13, 3], [6, 13], [11, 13], [9, 21], [18, 9], [13, 9]], fg); break;
  }
  p.outline(OUT28);
  return p;
}

export function appIconImg29(name: string, year = 2015, size = 24): HTMLImageElement {
  return pxImg28(`app29:${name}:${year >= 2013 ? 1 : 0}`, () => appIconPx29(name, year), size, size, { cls: 'app29', title: name });
}

// ---------------------------------------------------------------- placa da casa de shows (64×16)

export type Sign29 = 'painted' | 'marquee' | 'neon' | 'lightbox' | 'led';
export const SIGNS29: Sign29[] = ['painted', 'marquee', 'neon', 'lightbox', 'led'];
export function signKind29(year: number, id = ''): Sign29 {
  const b = relicBand28(year);
  const opts: Sign29[][] = [['painted', 'marquee'], ['marquee', 'painted', 'neon'], ['neon', 'marquee'], ['neon', 'lightbox'], ['lightbox', 'led', 'neon'], ['led', 'neon']];
  const o = opts[b];
  return o[h28('sg29', id) % o.length];
}

export function signPx29(name: string, year: number, id = '', kind = signKind29(year, id)): Px {
  const W = 64, H = 16;
  const p = new Px(W, H);
  const hue = h28('sgh29', id || name) % 360;
  const t = fitText(name, W - 8);
  const x0 = Math.round((W - textWidth(t)) / 2);
  switch (kind) {
    case 'painted': {
      const wd = C('#7a4a26');
      p.rect(1, 2, W - 2, 12, wd); for (let x = 2; x < W - 2; x++) if (noise(x, 5, h28(name)) < 0.15) p.vline(x, 3, 12, shade(wd, -0.15));
      p.rect(3, 4, W - 6, 8, K.cream); drawText(p, t, x0 + 1, 6, shade(hsl(hue, 50, 30), -0.3)); drawText(p, t, x0, 5, hsl(hue, 55, 32));
      p.vline(8, 0, 2, K.dgrey); p.vline(W - 9, 0, 2, K.dgrey);
      break;
    }
    case 'marquee': {
      p.rect(0, 1, W, 14, C('#e8dcc0')); p.rect(2, 3, W - 4, 10, C('#f8f0dc'));
      for (let x = 1; x < W; x += 3) { p.put(x, 1, BULB); p.put(x, 14, BULB); }
      for (let y = 4; y < 13; y += 3) { p.put(0, y, BULB); p.put(W - 1, y, BULB); }
      drawText(p, t, x0, 6, C('#2a1a20'));
      break;
    }
    case 'neon': {
      p.rect(0, 0, W, H, C('#141018'));
      const c = NEON(hue);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) drawText(p, t, x0 + dx, 6 + dy, withAlpha(c, 70));
      drawText(p, t, x0, 6, mix(c, K.white, 0.45));
      p.hline(3, W - 4, 13, NEON(hue + 160)); p.hline(3, W - 4, 2, withAlpha(NEON(hue + 160), 140));
      break;
    }
    case 'lightbox': {
      const bg = hsl(hue, 70, 50);
      p.rect(0, 1, W, 14, K.dgrey); p.rect(2, 2, W - 4, 12, bg); p.rect(2, 2, W - 4, 4, mix(bg, K.white, 0.25));
      drawText(p, t, x0 + 1, 6, shade(bg, -0.5)); drawText(p, t, x0, 5, K.white);
      break;
    }
    case 'led': {
      p.rect(0, 0, W, H, C('#0a0a10'));
      const c = hsl(hue, 90, 60);
      const q = new Px(W, H); drawText(q, t, x0, 5, c);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) p.put(x, y, q.get(x, y) ? c : (x + y) % 2 ? C('#16141c') : C('#0e0c14'));
      break;
    }
  }
  p.outline(OUT28);
  return p;
}

export function signImg29(name: string, year: number, id = '', w = 128): HTMLImageElement {
  const k = signKind29(year, id);
  return pxImg28(`sg29:${id}:${name}:${k}`, () => signPx29(name, year, id, k), w, w / 4, { cls: 'sign29', title: name });
}
