// Rodada 28 (ARTE) — mais CAPAS (40×40) no mesmo estilo antigo de art.ts: 27 composições novas por gênero e época
// (jazz tipográfico dos 50, retrato em duotom, moldura art déco, pôr do sol country, folhas tropicais, moldura clássica,
// letras ondulantes psicodélicas, paisagem de gatefold prog, colagem de bilhete de resgate punk, glitter disco, Memphis
// dos 80, metal escuro, grafite, cromado synth, foto granulada dos 90, foto de rua com selo "explicit", smiley de rave,
// bolha 3D dos 2000, corrente de ouro, pontos minimalistas, forma de onda, glitch digital, polaroide de quarto, sol
// rastafári, kente, ondas e sol nascente, palco ao vivo). E o desgaste: marca de aro de vinil (disco antigo no catálogo)
// e adesivo de loja. Cerca de 1/3 das capas segue no desenho original de art.ts (a escolha é pela semente).

import { FAMILIES, familyOf } from '../../data/world';
import { drawText, drawTextOutlined, fitText, textWidth } from './font';
import { C, Px, dith, hsl, mix, noise, shade, withAlpha, type Col } from './px';
import { h28, rng28 } from './art28kit';
import type { Rng } from '../../core/rng';

/** Estilo de capa de art.ts (mesmos nomes; só o tipo). */
export type CoverStyle28 = 'deco' | 'classic' | 'psych' | 'punk' | 'neon' | 'grunge' | 'gloss' | 'minimal' | 'neural';

export type Mood28 = 'metal' | 'punk' | 'hiphop' | 'electronic' | 'jazz' | 'country' | 'reggae' | 'latin' | 'brazil' | 'africa' | 'asia' | 'classical' | 'disco' | 'indie' | 'britpop' | 'synth' | 'soul' | 'rock' | 'pop';

const MOOD_G: [RegExp, Mood28][] = [
  [/metal|thrash|hard_rock|black_metal|death_metal|nu_metal/, 'metal'], [/punk|garage_rock|hardcore/, 'punk'], [/disco|hi_nrg|italo|eurodance|funk$|go_go/, 'disco'],
  [/britpop|beat$|pub_rock|celtic/, 'britpop'], [/indie|alt_rock|shoegaze|emo|bedroom|post_rock|k_indie|grunge/, 'indie'], [/synthpop|new_wave|vaporwave|city_pop|k_synth|neue_deutsche/, 'synth'],
];
const MOOD_F: Record<string, Mood28> = {
  blues_jazz: 'jazz', country_folk: 'country', rnb: 'soul', rock: 'rock', pop: 'pop', hiphop: 'hiphop', electronic: 'electronic', caribbean: 'reggae', latin: 'latin', brazil: 'brazil', africa: 'africa', asia_me: 'asia', europe: 'pop', sacred: 'classical',
};
/** Clima visual de um gênero (para capas e logos). */
export function genreMood28(genre: string): Mood28 {
  for (const [re, m] of MOOD_G) if (re.test(genre)) return m;
  return MOOD_F[familyOf(genre)] ?? 'pop';
}
const hueOf = (genre: string): number => FAMILIES.find((f) => f.id === familyOf(genre))?.hue ?? 200;

export const COVER_LAYOUTS28 = [
  'jazz_type', 'duotone', 'deco_frame', 'country_sunset', 'tropical', 'classical_frame', 'psych_wavy', 'prog_gatefold', 'punk_ransom', 'disco_glitter',
  'memphis', 'metal_dark', 'graffiti', 'chrome', 'grain_photo', 'street_explicit', 'rave_smiley', 'blob3d', 'gold_chain', 'dots', 'waveform', 'glitch',
  'polaroid', 'rasta_sun', 'kente', 'waves_sun', 'live_stage',
] as const;
export type CoverLayout28 = (typeof COVER_LAYOUTS28)[number];

const BY_STYLE: Record<CoverStyle28, CoverLayout28[]> = {
  deco: ['deco_frame', 'duotone'], classic: ['duotone', 'deco_frame'], psych: ['psych_wavy', 'duotone'], punk: ['punk_ransom', 'live_stage'],
  neon: ['memphis', 'chrome', 'live_stage'], grunge: ['grain_photo', 'polaroid', 'live_stage'], gloss: ['blob3d', 'glitch', 'dots'], minimal: ['dots', 'waveform', 'polaroid', 'glitch'], neural: ['glitch', 'waveform', 'blob3d'],
};
function moodLayouts(m: Mood28, y: number): CoverLayout28[] {
  switch (m) {
    case 'jazz': return y < 1972 ? ['jazz_type', 'jazz_type'] : ['jazz_type'];
    case 'country': return ['country_sunset'];
    case 'latin': case 'brazil': return ['tropical'];
    case 'classical': return ['classical_frame', 'classical_frame'];
    case 'reggae': return y >= 1965 ? ['rasta_sun'] : ['tropical'];
    case 'africa': return ['kente'];
    case 'asia': return ['waves_sun'];
    case 'metal': return y >= 1969 ? ['metal_dark', 'metal_dark'] : [];
    case 'hiphop': return y >= 1979 ? (y < 2000 ? ['graffiti', 'street_explicit'] : ['gold_chain', 'graffiti', 'street_explicit']) : [];
    case 'disco': return y >= 1972 ? ['disco_glitter'] : [];
    case 'electronic': return y >= 1987 && y < 2000 ? ['rave_smiley', 'waveform'] : ['waveform', 'dots'];
    case 'synth': return y >= 1978 ? ['chrome'] : [];
    case 'punk': return y >= 1974 ? ['punk_ransom'] : [];
    case 'indie': return ['polaroid', 'grain_photo'];
    case 'rock': return y >= 1967 && y < 1980 ? ['prog_gatefold'] : [];
    default: return [];
  }
}

/** Composição escolhida (ou null = desenho original de art.ts). Pura. */
export function coverLayout28(seed: number, genre: string, year: number, style: CoverStyle28, title = ''): CoverLayout28 | null {
  const v = h28('cov', seed) % 100;
  if (v < 34) return null;
  if (/\b(live|ao vivo|en vivo|alive)\b/i.test(title) && v < 60) return 'live_stage';
  // o gênero manda primeiro (≈70%); o resto vem do repertório da época
  const mood = moodLayouts(genreMood28(genre), year);
  const pool = mood.length && h28('covm', seed) % 100 < 70 ? mood : BY_STYLE[style];
  return pool[h28('covp', seed) % pool.length];
}

// ---------------------------------------------------------------- utilidades

const Nn = 40;
interface Cx { p: Px; r: Rng; hue: number; seed: number; title: string; act: string; y: number; rich: boolean }
const center = (p: Px, t: string, y: number, c: Col, sc = 1) => drawText(p, t, Math.round((Nn - textWidth(t, sc)) / 2), y, c, sc);
const centerO = (p: Px, t: string, y: number, c: Col, o: Col, sc = 1) => drawTextOutlined(p, t, Math.round((Nn - textWidth(t, sc)) / 2), y, c, o, sc);
const big = (t: string) => { const s2 = fitText(t, 36, 2); return s2.length >= Math.min(3, normalizeLen(t)) ? { t: s2, sc: 2 } : { t: fitText(t, 36), sc: 1 }; };
const normalizeLen = (t: string) => t.replace(/\s+/g, '').length;
const ink = C('#151214');
function grad(p: Px, a: Col, b: Col, y0 = 0, y1 = Nn): void { for (let y = y0; y < y1; y++) for (let x = 0; x < Nn; x++) p.put(x, y, dith(x, y, ((y - y0) / Math.max(1, y1 - y0 - 1)) * 0.999) ? b : a); }
function figure(p: Px, cx: number, base: number, c: Col, sc = 1, prop: 'mic' | 'gtr' | 'sax' | '' = ''): void {
  p.disc(cx, base - 15 * sc, 3 * sc, c); p.poly([[cx - 6 * sc, base], [cx - 4 * sc, base - 11 * sc], [cx + 4 * sc, base - 11 * sc], [cx + 6 * sc, base]], c);
  if (prop === 'mic') { p.vline(cx + 7 * sc, base - 14 * sc, base, c); p.disc(cx + 7 * sc, base - 15 * sc, 1.3 * sc, c); }
  if (prop === 'gtr') { p.ellipse(cx - 1, base - 5 * sc, 4 * sc, 2.6 * sc, c); p.line(cx, base - 6 * sc, cx + 9 * sc, base - 12 * sc, c); }
  if (prop === 'sax') { p.line(cx + 2, base - 12 * sc, cx + 5, base - 4 * sc, c); p.disc(cx + 6, base - 4 * sc, 2 * sc, c); }
}

// ---------------------------------------------------------------- composições

const L: Record<CoverLayout28, (c: Cx) => void> = {
  jazz_type: ({ p, r, hue, title, act }) => {
    const band = hsl(hue + r.int(-30, 30), 70, 48);
    p.rect(0, 0, Nn, 24, C('#e8e0d0'));
    for (let y = 0; y < 24; y++) for (let x = 0; x < Nn; x++) if (dith(x, y, 0.25)) p.put(x, y, mix(C('#e8e0d0'), band, 0.35));
    figure(p, r.int(12, 28), 24, C('#1e1a1c'), 1, r.pick(['sax', 'mic', 'gtr'] as const));
    p.rect(0, 24, Nn, 16, band); p.rect(0, 24, 4, 16, ink);
    const b = big(act); drawText(p, b.t, 6, 26, C('#f8f4ec'), b.sc);
    drawText(p, fitText(title, 32), 6, b.sc === 2 ? 37 - 2 : 33, ink);
  },
  duotone: ({ p, r, hue, title, act }) => {
    const lo = hsl(hue, 55, 22), hi = hsl(hue + 20, 60, 70);
    const fx = r.int(15, 25);
    for (let y = 0; y < Nn; y++) for (let x = 0; x < Nn; x++) {
      const face = ((x - fx) / 7) ** 2 + ((y - 17) / 9) ** 2;
      const hair = ((x - fx) / 9) ** 2 + ((y - 13) / 9) ** 2 < 1 && y < 15;
      const v = hair ? 0.15 : face < 1 ? 0.75 - face * 0.3 + noise(x, y, 3) * 0.1 : y > 28 && Math.abs(x - fx) < 13 ? 0.3 : 0.55 + (x / Nn) * 0.2;
      p.put(x, y, dith(x, y, v) ? hi : lo);
    }
    p.put(fx - 3, 16, lo); p.put(fx + 2, 16, lo); p.hline(fx - 1, fx + 1, 21, lo);
    p.rect(0, 0, Nn, 8, withAlpha(C('#f8f4ec'), 230)); drawText(p, fitText(act, 36), 2, 2, lo);
    drawTextOutlined(p, fitText(title, 36), 2, 33, C('#f8f4ec'), lo);
  },
  deco_frame: ({ p, title, act, hue }) => {
    p.rect(0, 0, Nn, Nn, C('#1c1716'));
    for (let y = 0; y < Nn; y++) for (let x = 0; x < Nn; x++) if (Math.floor(((Math.atan2(y - 42, x - 19.5) + Math.PI) / Math.PI) * 18) % 2) p.put(x, y, C('#2c2420'));
    const g = C('#e8c45a');
    for (const k of [1, 3]) { p.hline(k, Nn - 1 - k, k, g); p.hline(k, Nn - 1 - k, Nn - 1 - k, g); p.vline(k, k, Nn - 1 - k, g); p.vline(Nn - 1 - k, k, Nn - 1 - k, g); }
    p.poly([[20, 30], [8, 38], [32, 38]], C('#a8843a')); for (let i = -3; i <= 3; i++) p.line(20, 30, 20 + i * 4, 37, g);
    p.rect(6, 12, 28, 11, C('#e8dcc0')); p.hline(6, 33, 12, g); p.hline(6, 33, 22, g);
    center(p, fitText(act, 26), 14, hsl(hue, 50, 25)); center(p, fitText(title, 26), 6, g);
  },
  country_sunset: ({ p, r, title, act }) => {
    grad(p, C('#f0a040'), C('#e0587a'), 0, 26); p.disc(20, 26, 8, C('#ffe080'));
    p.fill((x, y) => (y >= 26 - Math.round(Math.sin(x * 0.2) * 2) ? C('#3a2418') : 0));
    for (let x = 3; x < Nn; x += 7) { p.vline(x, 24, 31, C('#5a3a20')); } p.hline(0, 39, 26, C('#5a3a20'));
    if (r.chance(0.5)) { p.ellipse(28, 30, 5, 1.2, C('#1e1410')); p.rect(26, 26, 5, 4, C('#1e1410')); } else { p.rect(29, 20, 2, 8, C('#2a4a20')); p.rect(27, 22, 2, 2, C('#2a4a20')); p.rect(31, 21, 2, 2, C('#2a4a20')); }
    p.rect(2, 2, 36, 9, C('#c89860')); p.hline(2, 37, 6, C('#a87840')); center(p, fitText(act, 34), 4, C('#3a2010'));
    center(p, fitText(title, 36), 33, C('#f4e4b8'));
  },
  tropical: ({ p, r, hue, title, act }) => {
    p.rect(0, 0, Nn, Nn, hsl(hue + 30, 70, 62));
    const leaf = (cx: number, cy: number, rx: number, ry: number, c: Col) => { p.ellipse(cx, cy, rx, ry, c); for (let i = -2; i <= 2; i++) p.line(cx, cy, cx + i * 3, cy + ry, shade(c, 0.25)); };
    leaf(4, 6, 9, 7, C('#2c7a3c')); leaf(36, 34, 9, 8, C('#2c7a3c')); leaf(35, 4, 6, 5, C('#48b85c')); leaf(5, 35, 6, 6, C('#48b85c'));
    p.disc(r.int(14, 26), 18, 4, C('#e04848')); p.disc(r.int(14, 26), 22, 3, C('#f0c040'));
    p.rect(4, 14, 32, 10, withAlpha(C('#f8f4ec'), 220)); center(p, fitText(act, 30), 16, hsl(hue + 180, 60, 30)); center(p, fitText(title, 30), 32, C('#151214'));
  },
  classical_frame: ({ p, r, title, act }) => {
    p.rect(0, 0, Nn, Nn, C('#ece0c4'));
    const g = C('#9a7a3a');
    p.rect(2, 2, 36, 36, 0); for (const k of [2, 4]) { p.hline(k, Nn - 1 - k, k, g); p.hline(k, Nn - 1 - k, Nn - 1 - k, g); p.vline(k, k, Nn - 1 - k, g); p.vline(Nn - 1 - k, k, Nn - 1 - k, g); }
    for (const [x, y] of [[3, 3], [36, 3], [3, 36], [36, 36]] as const) p.disc(x, y, 1.6, g);
    p.ellipse(20, 17, 8, 9, C('#c8b088')); p.ring(20, 17, 8.5, g);
    p.disc(20, 14, 3, C('#5a4028')); p.poly([[14, 25], [16, 18], [24, 18], [26, 25]], C('#5a4028'));
    if (r.chance(0.5)) p.rect(17, 11, 7, 2, C('#e8dcc0'));
    center(p, fitText(act, 30), 28, C('#3a2a18')); center(p, fitText(title, 30), 33, g);
  },
  psych_wavy: ({ p, r, hue, title, act, seed }) => {
    for (let y = 0; y < Nn; y++) for (let x = 0; x < Nn; x++) { const d = Math.hypot(x - 20, y - 22); p.put(x, y, hsl(hue + Math.floor((d + Math.sin(x * 0.3) * 3) / 3) * 47, 85, 55)); }
    p.ellipse(20, 23, 9, 5, C('#f8f4ec')); p.disc(20, 23, 3.4, hsl(hue + 180, 80, 45)); p.disc(20, 23, 1.4, ink); p.put(19, 22, C('#ffffff'));
    const tmp = new Px(Nn, 14); const b = big(act); drawTextOutlined(tmp, b.t, Math.round((Nn - textWidth(b.t, b.sc)) / 2), 2, C('#fff2b0'), ink, b.sc);
    for (let x = 0; x < Nn; x++) { const off = Math.round(Math.sin(x * 0.35 + (seed % 7)) * 2); for (let y = 0; y < 14; y++) { const c = tmp.get(x, y); if (c) p.set(x, y + 1 + off, c); } }
    centerO(p, fitText(title, 36), 33, C('#f8f4ec'), ink); void r;
  },
  prog_gatefold: ({ p, r, hue, title, act }) => {
    grad(p, hsl(hue + 200, 50, 18), hsl(hue + 240, 45, 40), 0, 28);
    for (let i = 0; i < 12; i++) p.put(r.int(0, 39), r.int(0, 20), C('#f8f4ec'));
    p.disc(r.int(26, 32), 9, 5, C('#f0e8c8')); p.disc(r.int(26, 32) + 2, 8, 4, withAlpha(hsl(hue + 220, 40, 30), 120));
    p.rect(0, 28, Nn, 12, hsl(hue + 190, 50, 25)); for (let y = 29; y < 40; y += 2) p.hline(0, 39, y, hsl(hue + 190, 45, 32));
    p.poly([[8, 18], [22, 17], [19, 23], [15, 30], [12, 23]], C('#5a4a3a')); p.ellipse(15, 17, 7, 2, C('#3a7a3a'));
    p.vline(17, 22, 30, C('#8ac8f0')); p.vline(14, 10, 16, C('#3a2a18')); p.disc(14, 10, 3, C('#2c6a2c'));
    p.vline(0, 0, 39, withAlpha(C('#000000'), 90));
    drawText(p, fitText(act, 36), 3, 2, C('#f0e8c8')); drawText(p, fitText(title, 36), 3, 33, C('#f0e8c8'));
  },
  punk_ransom: ({ p, r, hue, title, act }) => {
    p.rect(0, 0, Nn, Nn, C('#f8e830'));
    p.rect(0, 22, Nn, 18, C('#f06aa8'));
    const t = fitText(title, 60); let x = 2, y = 25;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i]; const w = textWidth(ch); if (ch === ' ') { x += 3; continue; } if (x + w > 37) { x = 2; y += 8; } if (y > 33) break;
      const bg = r.pick([C('#ffffff'), C('#151214'), hsl(hue, 85, 55), C('#f8e830')]); p.rect(x - 1, y - 1 + (i % 2), w + 2, 7, bg); drawText(p, ch, x, y + (i % 2), bg === C('#151214') ? C('#ffffff') : C('#151214')); x += w + 3;
    }
    drawText(p, fitText(act, 36), 2, 3, C('#151214')); p.line(4, 12, 20, 16, C('#a8acb8')); p.line(4, 13, 20, 17, C('#d8dce4')); p.ring(4, 12.5, 1.5, C('#a8acb8'));
  },
  disco_glitter: ({ p, title, act, seed }) => {
    grad(p, C('#2a0e3a'), C('#7a1a6a'));
    p.vline(20, 0, 3, C('#a8acb8')); p.disc(20, 9, 6, (x, y) => ((x + y) % 2 ? C('#d8dce4') : noise(x, y, 4) > 0.7 ? C('#ffffff') : C('#8a90a0')));
    for (let i = 0; i < 40; i++) { const x = (h28('g', seed, i) % 40), y = (h28('gy', seed, i) % 40); p.set(x, y, i % 3 ? C('#fff2b0') : C('#ff8ad8')); }
    const tmp = new Px(Nn, 14); const b = big(act); drawText(tmp, b.t, Math.round((Nn - textWidth(b.t, b.sc)) / 2) + 2, 2, C('#f0c040'), b.sc);
    for (let y = 0; y < 14; y++) for (let x = 0; x < Nn; x++) { const c = tmp.get(x, y); if (c) p.set(x - Math.floor(y / 4), 18 + y, c); }
    center(p, fitText(title, 36), 33, C('#ffb0e0'));
  },
  memphis: ({ p, r, title, act }) => {
    p.rect(0, 0, Nn, Nn, r.pick([C('#a8f0d8'), C('#f8c8d8'), C('#f8f0b0')]));
    for (let i = 0; i < 9; i++) { const x = r.int(0, 36), y = r.int(0, 36), c = r.pick([C('#f04888'), C('#2a8ae0'), C('#f8c020'), C('#151214')]); const k = r.int(0, 2); if (k === 0) p.poly([[x, y + 5], [x + 3, y], [x + 6, y + 5]], c); else if (k === 1) for (let j = 0; j < 8; j++) p.put(x + j, y + (j % 2 ? 1 : 0) + (j % 4 > 1 ? 1 : 0), c); else p.disc(x + 2, y + 2, 1.6, c); }
    for (let y = 30; y < 40; y += 2) for (let x = (y % 4); x < 40; x += 4) p.put(x, y, C('#151214'));
    p.rect(4, 12, 32, 13, C('#151214')); center(p, fitText(act, 30), 14, C('#f8f4ec')); center(p, fitText(title, 30), 20, C('#f8c020'));
  },
  metal_dark: ({ p, r, hue, title, act }) => {
    p.rect(0, 0, Nn, Nn, C('#0e0a0c'));
    const glow = hsl(r.chance(0.6) ? 0 : hue, 80, 40);
    for (let y = 22; y < Nn; y++) for (let x = 0; x < Nn; x++) if (dith(x, y, (y - 22) / 18)) p.put(x, y, glow);
    if (r.chance(0.5)) { p.disc(20, 23, 7, C('#e8e0d0')); p.rect(15, 27, 11, 5, C('#e8e0d0')); p.disc(17, 23, 2, C('#0e0a0c')); p.disc(23, 23, 2, C('#0e0a0c')); p.poly([[19, 26], [21, 26], [20, 28]], C('#0e0a0c')); for (let x = 16; x < 25; x += 2) p.vline(x, 29, 31, C('#0e0a0c')); }
    else p.poly([[22, 12], [14, 25], [19, 25], [16, 36], [27, 21], [21, 21], [25, 12]], C('#f0d040'));
    const b = big(act); const tmp = new Px(Nn, 14); drawText(tmp, b.t, Math.round((Nn - textWidth(b.t, b.sc)) / 2), 3, C('#d8dce4'), b.sc);
    for (let y = 0; y < 14; y++) for (let x = 0; x < Nn; x++) if (tmp.get(x, y)) { p.put(x, y + 1, y < 6 ? C('#ffffff') : C('#a8acb8')); if (!tmp.get(x, y - 1) && noise(x, y, 6) < 0.35) { p.put(x, y, C('#a8acb8')); p.put(x, y - 1, C('#6a6e78')); } }
    center(p, fitText(title, 36), 34, glow);
  },
  graffiti: ({ p, r, hue, title, act, seed }) => {
    for (let y = 0; y < Nn; y++) for (let x = 0; x < Nn; x++) p.put(x, y, y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0 ? C('#6a3a2a') : noise(x, y, seed) < 0.15 ? C('#a85a40') : C('#9a4e38'));
    const tag = fitText(act.replace(/^(the|os|as)\s+/i, ''), 36, 2) || 'XX';
    const tmp = new Px(Nn, 16); drawText(tmp, tag, Math.round((Nn - textWidth(tag, 2)) / 2), 3, C('#ffffff'), 2);
    const fill = hsl(hue + r.int(0, 360), 85, 58);
    for (let y = 0; y < 16; y++) for (let x = 0; x < Nn; x++) if (tmp.get(x, y)) p.put(x, y + 8, y < 7 ? shade(fill, 0.35) : fill);
    const snap = p.clone();
    for (let y = 6; y < 28; y++) for (let x = 0; x < Nn; x++) { const c = snap.get(x, y); if (c === fill || c === shade(fill, 0.35)) continue; if ([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]].some(([dx, dy]) => { const n = snap.get(x + dx, y + dy); return n === fill || n === shade(fill, 0.35); })) p.put(x, y, C('#151214')); }
    for (let i = 0; i < 4; i++) { const x = 6 + r.int(0, 28); p.vline(x, 24, 24 + r.int(2, 7), fill); }
    center(p, fitText(title, 36), 33, C('#f8f4ec'));
  },
  chrome: ({ p, title, act }) => {
    grad(p, C('#0a0620'), C('#2a0e4a'), 0, 24); p.rect(0, 24, Nn, 16, C('#0a0620'));
    for (let k = 0; k < 5; k++) p.hline(0, 39, 24 + Math.round(k * k * 0.7), C('#3ad8ff'));
    for (let k = -5; k <= 5; k++) p.line(20, 24, 20 + k * 8, 40, C('#2a6aa8'));
    const b = big(act); const tmp = new Px(Nn, 14); drawText(tmp, b.t, Math.round((Nn - textWidth(b.t, b.sc)) / 2), 2, C('#ffffff'), b.sc);
    const ramp = [C('#ffffff'), C('#c8f0ff'), C('#7ad0ff'), C('#3a4a8a'), C('#f0a0ff'), C('#ffffff')];
    for (let y = 0; y < 14; y++) for (let x = 0; x < Nn; x++) if (tmp.get(x, y)) p.put(x, y + 6, ramp[Math.min(5, Math.floor(y / 2.2))]);
    p.put(9, 7, C('#ffffff')); p.put(8, 8, C('#ffffff')); p.put(10, 8, C('#ffffff')); p.put(9, 9, C('#ffffff'));
    center(p, fitText(title, 36), 33, C('#ff6ad8'));
  },
  grain_photo: ({ p, r, hue, title, act, seed }) => {
    const d0 = hsl(hue + 180, 25, 18), d1 = hsl(hue + 180, 30, 45), d2 = hsl(hue + 190, 35, 72);
    const fx = r.int(12, 28);
    for (let y = 0; y < Nn; y++) for (let x = 0; x < Nn; x++) {
      const body = ((x - fx) / 3.5) ** 2 + ((y - 15) / 3.5) ** 2 < 1 || (Math.abs(x - fx) < 5 - (y - 20) * 0.1 && y > 19 && y < 32);
      const v = (body ? 0.15 : 0.55 + Math.sin(y * 0.5 + x * 0.1) * 0.15) + (noise(x, y, seed) - 0.5) * 0.5;
      p.put(x, y, v > 0.62 ? d2 : v > 0.32 ? d1 : d0);
    }
    for (let i = 0; i < 3; i++) { const x = r.int(0, 39); p.line(x, 0, x + r.int(-3, 3), 39, withAlpha(C('#f0ead8'), 60)); }
    drawText(p, fitText(act.toUpperCase(), 34), 3, 3, C('#e6dccb')); drawText(p, fitText(title, 34), 3, 34, C('#e6dccb'));
  },
  street_explicit: ({ p, r, title, act, seed }) => {
    for (let y = 0; y < Nn; y++) for (let x = 0; x < Nn; x++) { const v = 0.35 + (y / Nn) * 0.3 + (noise(x, y, seed) - 0.5) * 0.25; p.put(x, y, v > 0.55 ? C('#b8b4ae') : v > 0.4 ? C('#7a7672') : C('#3a3634')); }
    for (const [cx, s] of [[11, 1], [20, 1.15], [29, 1]] as const) figure(p, cx + r.int(-1, 1), 34, C('#151214'), s);
    p.rect(0, 0, Nn, 9, C('#151214')); drawText(p, fitText(act, 36), 2, 2, C('#f8f4ec'));
    drawText(p, fitText(title, 22), 2, 34, C('#f8f4ec'));
    p.rect(27, 31, 12, 8, C('#151214')); p.rect(28, 32, 10, 3, C('#f8f4ec')); p.hline(28, 37, 36, C('#f8f4ec'));
  },
  rave_smiley: ({ p, title, act }) => {
    for (let y = 0; y < Nn; y++) for (let x = 0; x < Nn; x++) p.put(x, y, ((x >> 2) + (y >> 2)) % 2 ? C('#151214') : C('#f8f4ec'));
    p.disc(20, 19, 10, C('#f8e030')); p.disc(16, 16, 1.6, C('#151214')); p.disc(24, 16, 1.6, C('#151214'));
    for (let x = 14; x <= 26; x++) p.put(x, 22 + Math.round(((x - 20) ** 2) / -12 + 3), C('#151214'));
    p.rect(0, 32, Nn, 8, C('#151214')); center(p, fitText(act, 36), 33, C('#f8e030')); void title;
  },
  blob3d: ({ p, r, hue, title, act }) => {
    grad(p, hsl(hue, 70, 55), hsl(hue + 60, 70, 35));
    const cx = r.int(16, 24), cy = r.int(14, 20);
    p.ellipse(cx, cy, 10, 8, (x, y) => { const lx = (x - cx + 4) / 10, ly = (y - cy + 4) / 8; const d = lx * lx + ly * ly; return d < 0.08 ? C('#ffffff') : d < 0.4 ? C('#d8dce8') : d < 1 ? C('#8a90b0') : C('#4a4a6a'); });
    p.poly([[0, 30], [40, 24], [40, 27], [0, 33]], withAlpha(C('#ffffff'), 70));
    drawText(p, fitText(act, 34), 3, 3, C('#ffffff')); drawText(p, fitText(title, 34), 3, 33, withAlpha(C('#ffffff'), 210));
  },
  gold_chain: ({ p, r, title, act }) => {
    p.rect(0, 0, Nn, Nn, C('#121012'));
    for (let a = 0; a <= 24; a++) { const t = (a / 24) * Math.PI; const x = 20 - Math.cos(t) * 15, y = 4 + Math.sin(t) * 14; p.disc(x, y, 1.3, a % 2 ? C('#f0c040') : C('#b07c1c')); }
    p.disc(20, 23, 6, C('#f0c040')); p.disc(20, 23, 4.6, C('#b07c1c'));
    const ini = fitText(act.split(/\s+/).map((w) => w[0]).join(''), 8); drawText(p, ini, 20 - Math.round(textWidth(ini) / 2), 21, C('#fff2b0'));
    for (let i = 0; i < 8; i++) p.put(r.int(8, 32), r.int(16, 30), C('#e8ffff'));
    center(p, fitText(act, 36), 32, C('#f0c040')); void title;
  },
  dots: ({ p, r, hue, title, act }) => {
    p.rect(0, 0, Nn, Nn, C('#f0ece4')); const hot = r.int(0, 24);
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) p.disc(8 + i * 6, 6 + j * 6, 1.3, j * 5 + i === hot ? hsl(hue, 80, 50) : C('#2a2628'));
    drawText(p, fitText(act, 36), 3, 35, C('#5c5856')); void title;
  },
  waveform: ({ p, r, hue, title, act, seed }) => {
    p.rect(0, 0, Nn, Nn, r.chance(0.5) ? C('#101418') : hsl(hue, 30, 88));
    const dark = p.get(0, 0) === C('#101418'); const lc = dark ? hsl(hue, 80, 60) : C('#151214');
    for (let x = 2; x < 38; x++) { const a = Math.abs(Math.sin(x * 0.7 + (seed % 9)) * Math.sin(x * 0.13)) * 9 + noise(x, 0, seed) * 2; p.vline(x, Math.round(19 - a), Math.round(19 + a), lc); }
    drawText(p, fitText(act, 36), 2, 2, dark ? C('#f0ece4') : C('#151214')); drawText(p, fitText(title, 36), 2, 33, dark ? C('#8a90a0') : C('#5c5856'));
  },
  glitch: ({ p, r, hue, title, act }) => {
    for (let y = 0; y < Nn; y++) { const c = hsl(hue + Math.floor(y / 5) * 37, 70, 30 + (y % 5) * 6); for (let x = 0; x < Nn; x++) p.put(x, y, c); }
    for (let k = 0; k < 6; k++) { const y = r.int(0, 38), w = r.int(6, 30), x = r.int(0, 20); p.rect(x, y, w, r.int(1, 2), r.pick([C('#ff3ad0'), C('#3af0ff'), C('#f8f4ec')])); }
    const t = fitText(act, 36); drawText(p, t, 3, 17, C('#ff3ad0')); drawText(p, t, 1, 17, C('#3af0ff')); drawText(p, t, 2, 17, C('#f8f4ec'));
    drawText(p, fitText(title, 36), 2, 33, C('#f8f4ec'));
  },
  polaroid: ({ p, r, hue, title, act, seed }) => {
    p.rect(0, 0, Nn, Nn, hsl(hue, 45, 82));
    const ph = new Px(26, 30); ph.rect(0, 0, 26, 30, C('#f8f4ec'));
    for (let y = 2; y < 22; y++) for (let x = 2; x < 24; x++) ph.put(x, y, y < 13 ? mix(C('#f0a070'), C('#e06080'), y / 13) : dith(x, y, 0.5) ? C('#3a5a7a') : C('#2a4a6a'));
    ph.disc(13, 13, 3, C('#ffe080'));
    for (let x = 4; x < 22; x++) if (noise(x, 25, seed) > 0.2) ph.put(x, 25, C('#3a5a9a'));
    const ang = r.pick([-1, 1]);
    for (let y = 0; y < 30; y++) for (let x = 0; x < 26; x++) p.set(7 + x + Math.round((y - 15) * 0.08 * ang), 3 + y + Math.round((x - 13) * -0.08 * ang), ph.get(x, y));
    drawText(p, fitText(act.toLowerCase(), 36), 2, 35, hsl(hue, 40, 30)); void title;
  },
  rasta_sun: ({ p, title, act }) => {
    p.rect(0, 0, Nn, 13, C('#c8302c')); p.rect(0, 13, Nn, 14, C('#f0c040')); p.rect(0, 27, Nn, 13, C('#2c7a3c'));
    p.disc(20, 20, 8, C('#f8e070')); for (let a = 0; a < 12; a++) p.line(20, 20, 20 + Math.cos(a * 0.52) * 13, 20 + Math.sin(a * 0.52) * 13, withAlpha(C('#fff2b0'), 140));
    p.disc(20, 20, 6, C('#c87830')); p.disc(18, 19, 1, C('#151214')); p.disc(22, 19, 1, C('#151214')); p.poly([[19, 21], [21, 21], [20, 23]], C('#151214'));
    for (let a = 0; a < 16; a++) p.disc(20 + Math.cos(a * 0.39) * 6.5, 20 + Math.sin(a * 0.39) * 6.5, 1.3, C('#7a4018'));
    centerO(p, fitText(act, 36), 3, C('#f8f4ec'), C('#151214')); centerO(p, fitText(title, 36), 33, C('#f8f4ec'), C('#151214'));
  },
  kente: ({ p, title, act }) => {
    const cs = [C('#f0c040'), C('#2c7a3c'), C('#c8302c'), C('#151214')];
    for (let y = 0; y < Nn; y++) for (let x = 0; x < Nn; x++) { const bx = Math.floor(x / 8), by = Math.floor(y / 8); const c = cs[(bx + by * 2) % 4]; p.put(x, y, (bx + by) % 2 ? (x % 3 === 0 ? cs[(bx + 1) % 4] : c) : y % 3 === 0 ? cs[(by + 2) % 4] : c); }
    p.disc(20, 19, 10, C('#f8f4ec')); p.ring(20, 19, 10, C('#151214'));
    center(p, fitText(act, 18), 15, C('#151214')); center(p, fitText(title, 18), 21, C('#c8302c'));
  },
  waves_sun: ({ p, r, hue, title, act }) => {
    p.rect(0, 0, Nn, Nn, C('#ece0c4')); p.disc(r.int(24, 30), 12, 8, hsl(r.chance(0.7) ? 0 : hue, 70, 48));
    for (let y = 22; y < Nn; y++) for (let x = 0; x < Nn; x++) { const v = Math.sin(x * 0.45 + y * 0.9) + Math.sin(x * 0.2 - y * 0.3); if (v > 0.7) p.put(x, y, C('#f8f4ec')); else p.put(x, y, y % 3 ? C('#2c4a8a') : C('#3a6ab0')); }
    p.vline(5, 3, 18, C('#151214')); drawText(p, fitText(act, 26), 8, 4, C('#151214')); drawText(p, fitText(title, 26), 8, 11, hsl(hue, 50, 35));
  },
  live_stage: ({ p, r, hue, title, act }) => {
    p.rect(0, 0, Nn, Nn, C('#0e0a12'));
    for (const sx of [6, 20, 34]) p.poly([[sx - 1, 0], [sx + 1, 0], [sx + 7 * (sx < 20 ? 1 : sx > 20 ? -1 : 0) + 6, 28], [sx + 7 * (sx < 20 ? 1 : sx > 20 ? -1 : 0) - 6, 28]], withAlpha(hsl(hue + sx * 4, 80, 70), 70));
    p.rect(0, 26, Nn, 3, C('#3a2a30')); figure(p, 20, 26, C('#151214'), 1, r.pick(['mic', 'gtr'] as const));
    for (let x = 0; x < Nn; x += 3) { const hh = r.int(2, 5); p.disc(x + 1, 40 - hh, 1.6, C('#151214')); p.rect(x, 40 - hh, 3, hh, C('#151214')); if (r.chance(0.25)) p.vline(x + 1, 30, 34, C('#151214')); }
    drawText(p, fitText(act, 36), 2, 2, C('#f8f4ec')); drawText(p, fitText(title, 36), 2, 9, hsl(hue, 70, 65));
  },
};

/** Pinta a capa nova (40×40) ou devolve null para o desenho original. Pura e determinística. */
export function cover28(seed: number, title: string, actName: string, genre: string, year: number, budget: number, style: CoverStyle28): Px | null {
  const lay = coverLayout28(seed, genre, year, style, title);
  if (!lay) return null;
  return coverLayoutPx28(lay, seed, title, actName, genre, year, budget);
}

/** Pinta uma composição específica (folha de contato e testes). */
export function coverLayoutPx28(lay: CoverLayout28, seed: number, title: string, actName: string, genre: string, year: number, budget = 0.6): Px {
  const p = new Px(Nn, Nn);
  const r = rng28('cover', seed, lay);
  const hue = (hueOf(genre) + r.int(-35, 35) + 360) % 360;
  L[lay]({ p, r, hue, seed, title, act: actName, y: year, rich: budget > 0.45 });
  if (budget <= 0.45) p.map((c) => mix(c, C('#808080'), 0.1));
  return p;
}

/**
 * Desgaste: marca de aro do vinil (disco que já tem anos de estante) e, às vezes, o adesivo de loja.
 * `age` = anos desde o lançamento (0 = novo). Só para discos físicos (até ~2005).
 */
export function wear28(p: Px, seed: number, age: number, year: number): void {
  if (year >= 2008) return;
  if (age >= 12 && h28('ring', seed) % 100 < 70) {
    const a = Math.min(120, 50 + age * 2);
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const d = Math.hypot(x + 0.5 - 20, y + 0.5 - 20);
      if (d > 16.2 && d < 17.6 && noise(x, y, seed) > 0.35) p.set(x, y, withAlpha(C('#f0ece4'), a));
      if (d < 16 && noise(x >> 1, y >> 1, seed + 3) < 0.04 * Math.min(1, age / 20)) p.set(x, y, withAlpha(C('#f0ece4'), a));
    }
  }
  if (year >= 1962 && h28('stk', seed) % 100 < 12) {
    const cx = 33, cy = 6;
    p.disc(cx, cy, 5, C('#f0c040')); p.ring(cx, cy, 5, C('#b07c1c'));
    drawText(p, 'HIT', cx - 5, cy - 2, C('#c8302c'));
  }
}
