// Rodada 29 (ARTE) — GEOGRAFIA no estilo antigo: BANDEIRA do país (24×16, desenho simplificado em faixas e símbolos;
// país sem desenho na tabela ganha uma flâmula neutra com o código, nunca uma bandeira inventada), BRASÃO da cidade
// (24×28: cores da região, torre/onda/montanha/sol pela geografia e o nome) e MINIATURA DO HORIZONTE da cidade (48×24),
// que reaproveita o plano de prédios do "Nosso mundo" (skyline27.skyPlan27): prédios da época, cúpulas, minaretes,
// pagodes, guindastes do boom. Tudo PURO e semeado; <img> memorizado em pxImg28.

import { cityById } from '../../data/world';
import { drawText, fitText, textWidth } from './font';
import { C, Px, dith, mix, shade, withAlpha, type Col } from './px';
import { K28 as K, OUT28, h28, pxImg28 } from './art28kit';
import { region27, skyPlan27, type Reg27 } from './skyline27';

// ---------------------------------------------------------------- bandeiras

/**
 * Bandeira simplificada: tipo + cores. h = faixas horizontais, v = verticais, + símbolos:
 * dot (círculo), star, cross (nórdica), cent (cruz central), tri (triângulo no mastro), can (cantão), maple, diag.
 */
type FlagSpec = [string, string[], string?];
const FLAGS: Record<string, FlagSpec> = {
  BRA: ['bra', ['#1e8a3a', '#f0c820', '#2c3a8a']], USA: ['usa', ['#b02a30', '#f4f0e8', '#2c3a6a']], GBR: ['gbr', ['#2c3a6a', '#f4f0e8', '#c8202c']],
  FRA: ['v', ['#2c3a8a', '#f4f0e8', '#d02a30']], ITA: ['v', ['#1e8a3a', '#f4f0e8', '#d02a30']], IRL: ['v', ['#1e8a3a', '#f4f0e8', '#f08a2c']], BEL: ['v', ['#1e1a1c', '#f0c820', '#d02a30']],
  MEX: ['v', ['#1e6a3a', '#f4f0e8', '#c8202c'], 'dot'], NGA: ['v', ['#1e8a3a', '#f4f0e8', '#1e8a3a']], PER: ['v', ['#d02a30', '#f4f0e8', '#d02a30']],
  DEU: ['h', ['#1e1a1c', '#d02a30', '#f0c820']], RUS: ['h', ['#f4f0e8', '#2c3a8a', '#d02a30']], NLD: ['h', ['#c8202c', '#f4f0e8', '#2c4a8a']], AUT: ['h', ['#d02a30', '#f4f0e8', '#d02a30']],
  HUN: ['h', ['#d02a30', '#f4f0e8', '#3a7a3a']], BGR: ['h', ['#f4f0e8', '#1e8a3a', '#d02a30']], COL: ['h', ['#f0c820', '#f0c820', '#2c3a8a', '#d02a30']], EST: ['h', ['#2c6ac8', '#1e1a1c', '#f4f0e8']],
  ARG: ['h', ['#7ab0e0', '#f4f0e8', '#7ab0e0'], 'sun'], ESP: ['h', ['#c8202c', '#f0c820', '#f0c820', '#c8202c']], UKR: ['h', ['#2c6ac8', '#f0c820']], POL: ['h', ['#f4f0e8', '#d02a30']],
  IDN: ['h', ['#d02a30', '#f4f0e8']], AUS: ['can', ['#2c3a6a', '#f4f0e8', '#c8202c']], NZL: ['can', ['#2c3a6a', '#f4f0e8', '#c8202c']],
  JPN: ['dot', ['#f4f0e8', '#c8202c']], BGD: ['dot', ['#1e6a3a', '#d02a30']], KOR: ['kor', ['#f4f0e8', '#c8202c', '#2c4a8a']], CHN: ['star', ['#d02a30', '#f0c820']], VNM: ['star', ['#d02a30', '#f0c820']],
  TUR: ['moon', ['#d02a30', '#f4f0e8']], TUN: ['moon', ['#d02a30', '#f4f0e8']], DZA: ['moon', ['#1e8a3a', '#f4f0e8', '#d02a30']], PAK: ['moon', ['#1e5a2a', '#f4f0e8']],
  SWE: ['cross', ['#2c6ac8', '#f0c820']], NOR: ['cross', ['#c8202c', '#f4f0e8', '#2c3a6a']], DNK: ['cross', ['#c8202c', '#f4f0e8']], FIN: ['cross', ['#f4f0e8', '#2c4a9a']], ISL: ['cross', ['#2c4a9a', '#f4f0e8', '#c8202c']],
  CHE: ['cent', ['#d02a30', '#f4f0e8']], GRC: ['grc', ['#2c6ac8', '#f4f0e8']], CUB: ['tri', ['#2c3a8a', '#f4f0e8', '#d02a30']], PRI: ['tri', ['#d02a30', '#f4f0e8', '#2c6ac8']],
  CZE: ['tri', ['#f4f0e8', '#d02a30', '#2c4a8a']], PHL: ['tri', ['#2c3a8a', '#d02a30', '#f4f0e8']], JAM: ['diag', ['#1e8a3a', '#f0c820', '#1e1a1c']], ZAF: ['tri', ['#1e8a3a', '#f0c820', '#2c3a8a', '#d02a30']],
  CAN: ['maple', ['#d02a30', '#f4f0e8']], IND: ['h', ['#f08a2c', '#f4f0e8', '#1e8a3a'], 'wheel'], GHA: ['h', ['#d02a30', '#f0c820', '#1e8a3a'], 'bstar'], SEN: ['v', ['#1e8a3a', '#f0c820', '#d02a30'], 'gstar'],
  MLI: ['v', ['#1e8a3a', '#f0c820', '#d02a30']], CMR: ['v', ['#1e8a3a', '#d02a30', '#f0c820'], 'ystar'], CIV: ['v', ['#f08a2c', '#f4f0e8', '#1e8a3a']], ETH: ['h', ['#1e8a3a', '#f0c820', '#d02a30'], 'dot'],
  EGY: ['h', ['#d02a30', '#f4f0e8', '#1e1a1c']], LBN: ['h', ['#d02a30', '#f4f0e8', '#f4f0e8', '#d02a30']], ISR: ['isr', ['#f4f0e8', '#2c4ab0']], IRN: ['h', ['#1e8a3a', '#f4f0e8', '#d02a30']],
  ARE: ['are', ['#1e8a3a', '#f4f0e8', '#1e1a1c', '#d02a30']], CHL: ['chl', ['#f4f0e8', '#d02a30', '#2c3a8a']], URY: ['h', ['#f4f0e8', '#2c4a9a', '#f4f0e8', '#2c4a9a'], 'sun'], VEN: ['h', ['#f0c820', '#2c3a8a', '#d02a30']],
  PRT: ['v2', ['#1e6a3a', '#d02a30'], 'dot'], THA: ['h', ['#d02a30', '#f4f0e8', '#2c3a6a', '#2c3a6a', '#f4f0e8', '#d02a30']], TWN: ['can', ['#d02a30', '#2c3a8a', '#f4f0e8']],
  KEN: ['h', ['#1e1a1c', '#d02a30', '#1e8a3a']], TZA: ['diag', ['#1e8a3a', '#2c6ac8', '#1e1a1c']], ROU: ['v', ['#2c3a8a', '#f0c820', '#d02a30']], SRB: ['h', ['#c8202c', '#2c3a6a', '#f4f0e8']],
  HKG: ['dot', ['#d02a30', '#f4f0e8']], SGP: ['h', ['#d02a30', '#f4f0e8']], MAR: ['star', ['#c8202c', '#1e6a3a']], DOM: ['cent', ['#2c3a8a', '#f4f0e8', '#d02a30']],
};
export const FLAG_CODES29 = Object.keys(FLAGS);

function star(p: Px, cx: number, cy: number, r: number, c: Col): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.45 : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  p.poly(pts, c);
}

/** Bandeira 24×16 (com mastro em 1 px à esquerda). País fora da tabela: flâmula neutra com o código. */
export function flagPx29(a3: string): Px {
  const W = 24, H = 16;
  const p = new Px(W, H);
  const f = FLAGS[a3];
  const x0 = 1, w = W - 1;
  if (!f) {
    // flâmula neutra (sem inventar bandeira de país real)
    p.poly([[x0, 1], [W - 1, 8], [x0, 15]], K.cream); p.poly([[x0, 1], [x0 + 6, 4], [x0 + 6, 12], [x0, 15]], K.grey);
    drawText(p, fitText(a3 || '?', 14), x0 + 7, 6, K.ink);
    p.vline(0, 0, H - 1, K.dgrey); p.outline(OUT28); return p;
  }
  const [k, cs0, sym] = f;
  const cs = cs0.map((x) => C(x));
  const band = (n: number, horiz: boolean) => { for (let y = 0; y < H; y++) for (let x = x0; x < W; x++) { const i = horiz ? Math.min(n - 1, Math.floor((y / H) * n)) : Math.min(n - 1, Math.floor(((x - x0) / w) * n)); p.put(x, y, cs[i]); } };
  switch (k) {
    case 'h': band(cs.length, true); break;
    case 'v': band(cs.length, false); break;
    case 'v2': for (let y = 0; y < H; y++) for (let x = x0; x < W; x++) p.put(x, y, x < x0 + 9 ? cs[0] : cs[1]); break;
    case 'dot': p.rect(x0, 0, w, H, cs[0]); p.disc(x0 + w / 2 - (a3 === 'BGD' ? 1.5 : 0), H / 2, 4.2, cs[1]); break;
    case 'star': p.rect(x0, 0, w, H, cs[0]); star(p, a3 === 'MAR' ? x0 + w / 2 : x0 + 5, a3 === 'MAR' ? 8 : 5, 3.4, cs[1]); if (a3 === 'CHN') for (const [sx, sy] of [[10, 2], [12, 4], [12, 7], [10, 9]]) p.put(x0 + sx, sy, cs[1]); break;
    case 'moon': if (cs.length === 3) { for (let y = 0; y < H; y++) for (let x = x0; x < W; x++) p.put(x, y, x < x0 + w / 2 ? cs[0] : cs[1]); } else if (a3 === 'PAK') { p.rect(x0, 0, w, H, cs[0]); p.rect(x0, 0, 6, H, cs[1]); } else p.rect(x0, 0, w, H, cs[0]);
      { const mx = x0 + w / 2 + (a3 === 'PAK' ? 3 : 0), mc = cs.length === 3 ? cs[2] : cs[1]; p.disc(mx - 1, 8, 4, mc); p.disc(mx + 0.5, 8, 3.3, p.get(Math.round(mx + 3), 2) || cs[0]); star(p, mx + 3.5, 8, 1.8, mc); }
      break;
    case 'cross': p.rect(x0, 0, w, H, cs[0]); if (cs.length === 3) { p.rect(x0 + 5, 0, 5, H, cs[1]); p.rect(x0, 5, w, 6, cs[1]); p.rect(x0 + 6, 0, 3, H, cs[2]); p.rect(x0, 6, w, 4, cs[2]); } else { p.rect(x0 + 6, 0, 3, H, cs[1]); p.rect(x0, 6, w, 4, cs[1]); } break;
    case 'cent': if (cs.length === 3) { for (let y = 0; y < H; y++) for (let x = x0; x < W; x++) p.put(x, y, (x < x0 + w / 2) === (y < H / 2) ? cs[0] : cs[2]); p.rect(x0 + 10, 0, 3, H, cs[1]); p.rect(x0, 6, w, 4, cs[1]); } else { p.rect(x0, 0, w, H, cs[0]); p.rect(x0 + 10, 3, 3, 10, cs[1]); p.rect(x0 + 7, 6, 9, 4, cs[1]); } break;
    case 'grc': for (let y = 0; y < H; y++) p.hline(x0, W - 1, y, Math.floor(y / 1.78) % 2 ? cs[1] : cs[0]); p.rect(x0, 0, 9, 9, cs[0]); p.rect(x0 + 3, 0, 3, 9, cs[1]); p.rect(x0, 3, 9, 3, cs[1]); break;
    case 'tri': { const n = cs.length - 1; for (let y = 0; y < H; y++) for (let x = x0; x < W; x++) p.put(x, y, cs[1 + Math.min(n - 1, Math.floor((y / H) * n))]); if (a3 === 'CUB' || a3 === 'PRI') for (let y = 0; y < H; y++) p.hline(x0, W - 1, y, Math.floor(y / 3.2) % 2 ? cs[1] : a3 === 'CUB' ? cs[0] : cs[0]); p.poly([[x0, 0], [x0 + 10, 8], [x0, 16]], a3 === 'CUB' ? cs[2] : a3 === 'PRI' ? cs[2] : cs[0]); if (a3 === 'CUB' || a3 === 'PRI') star(p, x0 + 3.5, 8, 2.2, K.white); break; }
    case 'diag': p.rect(x0, 0, w, H, cs[0]); for (let y = 0; y < H; y++) for (let x = x0; x < W; x++) { const d = Math.abs((x - x0) * (H / w) - y), e = Math.abs((x - x0) * (H / w) - (H - y)); if (d < 2.5 || e < 2.5) p.put(x, y, cs[1]); if (a3 === 'JAM' && (x < x0 + w / 2 ? Math.abs(y - H / 2) < (x - x0) * (H / w) / 2 - 1.5 : false)) p.put(x, y, cs[2]); if (a3 === 'JAM' && x >= x0 + w / 2 && Math.abs(y - H / 2) < (W - x) * (H / w) / 2 - 1.5) p.put(x, y, cs[2]); } break;
    case 'can': p.rect(x0, 0, w, H, cs[0]); p.rect(x0, 0, 11, 8, a3 === 'TWN' ? cs[1] : cs[0]); if (a3 !== 'TWN') { p.line(x0, 0, x0 + 10, 7, cs[1]); p.line(x0 + 10, 0, x0, 7, cs[1]); p.hline(x0, x0 + 10, 3, cs[2]); p.vline(x0 + 5, 0, 7, cs[2]); for (const [sx, sy] of [[17, 4], [19, 8], [15, 9], [17, 13]]) p.put(x0 + sx, sy, K.white); } else p.disc(x0 + 5, 4, 2.2, cs[2]); break;
    case 'usa': for (let y = 0; y < H; y++) p.hline(x0, W - 1, y, Math.floor(y / 1.23) % 2 ? cs[1] : cs[0]); p.rect(x0, 0, 10, 8, cs[2]); for (let y = 1; y < 7; y += 2) for (let x = x0 + 1; x < x0 + 9; x += 2) p.put(x + ((y >> 1) % 2), y, K.white); break;
    case 'gbr': p.rect(x0, 0, w, H, cs[0]); p.line(x0, 0, W - 1, H - 1, cs[1]); p.line(x0, H - 1, W - 1, 0, cs[1]); p.line(x0 + 1, 0, W - 1, H - 2, cs[2]); p.line(x0, H - 2, W - 2, 0, cs[2]); p.rect(x0 + 9, 0, 5, H, cs[1]); p.rect(x0, 5, w, 6, cs[1]); p.rect(x0 + 10, 0, 3, H, cs[2]); p.rect(x0, 6, w, 4, cs[2]); break;
    case 'bra': p.rect(x0, 0, w, H, cs[0]); p.poly([[x0 + 2, 8], [x0 + w / 2, 1.5], [W - 2, 8], [x0 + w / 2, 14.5]], cs[1]); p.disc(x0 + w / 2, 8, 3.6, cs[2]); p.line(x0 + w / 2 - 3, 7, x0 + w / 2 + 3, 8, K.white); break;
    case 'kor': p.rect(x0, 0, w, H, cs[0]); p.disc(x0 + w / 2, 8, 4, cs[2]); for (let y = 4; y < 8; y++) for (let x = x0 + 7; x < x0 + 17; x++) if (p.get(x, y) === cs[2]) p.put(x, y, cs[1]); for (const [x, y] of [[3, 2], [19, 2], [3, 12], [19, 12]]) p.rect(x0 + x, y, 2, 2, K.ink); break;
    case 'isr': p.rect(x0, 0, w, H, cs[0]); p.rect(x0, 2, w, 2, cs[1]); p.rect(x0, 12, w, 2, cs[1]); p.poly([[x0 + 11.5, 4.5], [x0 + 14, 9], [x0 + 9, 9]], 0); p.ring(x0 + 11.5, 8, 2.5, cs[1]); break;
    case 'are': p.rect(x0, 0, w, 5, cs[0]); p.rect(x0, 5, w, 6, cs[1]); p.rect(x0, 11, w, 5, cs[2]); p.rect(x0, 0, 6, H, cs[3]); break;
    case 'chl': p.rect(x0, 0, w, 8, cs[0]); p.rect(x0, 8, w, 8, cs[1]); p.rect(x0, 0, 8, 8, cs[2]); star(p, x0 + 4, 4, 2.4, K.white); break;
    case 'maple': p.rect(x0, 0, w, H, cs[1]); p.rect(x0, 0, 6, H, cs[0]); p.rect(W - 6, 0, 6, H, cs[0]); p.poly([[x0 + 11.5, 3], [x0 + 15, 8], [x0 + 13, 8], [x0 + 13, 12], [x0 + 10, 12], [x0 + 10, 8], [x0 + 8, 8]], cs[0]); break;
  }
  if (sym === 'dot') p.disc(x0 + (k === 'v2' ? 9 : w / 2), 8, 2.5, k === 'v2' ? C('#f0c820') : C('#2c4a8a'));
  if (sym === 'sun') p.disc(x0 + (a3 === 'URY' ? 4 : w / 2), a3 === 'URY' ? 4 : 8, 2.2, C('#f0c040'));
  if (sym === 'wheel') p.ring(x0 + w / 2, 8, 2, C('#2c3a8a'));
  if (sym === 'bstar') star(p, x0 + w / 2, 8, 2.6, K.ink);
  if (sym === 'gstar') star(p, x0 + w / 2, 8, 2.6, C('#1e8a3a'));
  if (sym === 'ystar') star(p, x0 + w / 2, 8, 2.6, C('#f0c820'));
  p.vline(0, 0, H - 1, K.dgrey);
  p.outline(OUT28);
  return p;
}

export function flagImg29(a3: string, w = 24): HTMLImageElement {
  return pxImg28(`flag29:${a3}`, () => flagPx29(a3), w, (w * 16) / 24, { cls: 'flag29', title: a3 });
}

// ---------------------------------------------------------------- brasão da cidade

const REG_COL: Record<Reg27, [string, string]> = {
  us: ['#2c3a6a', '#c8302c'], br: ['#1e7a3a', '#f0c040'], latam: ['#9c2c2c', '#f0c040'], carib: ['#1e8a6a', '#f0c040'], uk: ['#7a1a2a', '#d8dce4'], eu: ['#2c4a8a', '#f0c040'],
  med: ['#2c6ac8', '#f4f0e8'], nordic: ['#2c4a8a', '#f4f0e8'], east: ['#5a1018', '#c09048'], mena: ['#1e6a5a', '#e8c070'], asia: ['#9c1c1c', '#f4f0e8'], south: ['#c86020', '#f4e4b8'],
  africa: ['#1e6a3a', '#f0c040'], oceania: ['#2c5aa0', '#f4f0e8'],
};
export type CityCharge29 = 'tower' | 'wave' | 'mountain' | 'sun' | 'palm' | 'star' | 'bridge' | 'crown' | 'note' | 'gate';
export const CITY_CHARGES29: CityCharge29[] = ['tower', 'wave', 'mountain', 'sun', 'palm', 'star', 'bridge', 'crown', 'note', 'gate'];

export function cityChargeOf29(city: string): CityCharge29 {
  const reg = region27(city);
  const lat = cityById[city]?.lat ?? 40;
  const n = city.toLowerCase();
  if (/port|porto|harbor|bay|baia|rio|beach|praia|mar|kingston|havana|sydney|miami|lisbon|naples|marseille|honolulu|santos|recife|salvador/.test(n)) return h28('cc29', city) % 2 ? 'wave' : 'bridge';
  if (reg === 'carib' || (Math.abs(lat) < 23 && reg !== 'asia')) return h28('cc29', city) % 2 ? 'palm' : 'sun';
  if (/denver|la_paz|quito|bogota|mexico|santiago|vienna|zurich|innsbruck|kathmandu|addis/.test(n)) return 'mountain';
  if (reg === 'asia') return h28('cc29', city) % 2 ? 'gate' : 'sun';
  return (['tower', 'crown', 'star', 'note', 'tower', 'bridge'] as CityCharge29[])[h28('cc29', city) % 6];
}

/** Brasão 24×28 da cidade: escudo nas cores da região com a carga (geografia) e as iniciais. */
export function cityCrestPx29(city: string): Px {
  const W = 24, H = 28;
  const p = new Px(W, H);
  const reg = region27(city);
  const [a0, b0] = REG_COL[reg];
  let a = C(a0), b = C(b0);
  if (h28('ccs29', city) % 3 === 0) [a, b] = [shade(a, 0.15), b];
  const inside = (x: number, y: number) => x >= 2 && x <= 21 && y >= 4 && (y < 16 || Math.abs(x + 0.5 - 12) <= (25 - y) * 1.05) && y <= 25;
  const div = h28('ccd29', city) % 3;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) p.put(x, y, div === 1 && x >= 12 ? shade(a, -0.18) : div === 2 && y < 10 ? b : a);
  // coroa mural (torres) — cidades
  for (let i = 0; i < 4; i++) { const tx = 4 + i * 5; p.rect(tx, 1, 3, 3, K.gold); p.put(tx + 1, 1, 0); }
  p.rect(3, 3, 18, 1, K.dgold);
  const ch = cityChargeOf29(city);
  const c = div === 2 ? K.white : b;
  const cx = 12, cy = 16;
  switch (ch) {
    case 'tower': p.rect(cx - 3, cy - 4, 7, 9, c); for (let i = 0; i < 3; i++) p.rect(cx - 3 + i * 3, cy - 6, 1, 2, c); p.rect(cx - 1, cy + 1, 3, 4, a); break;
    case 'wave': for (let k = 0; k < 3; k++) for (let x = 4; x < 20; x++) p.put(x, Math.round(cy - 3 + k * 3 + Math.sin(x * 0.8) * 1.2), c); break;
    case 'mountain': p.poly([[4, cy + 5], [10, cy - 5], [14, cy], [16, cy - 2], [20, cy + 5]], c); p.poly([[8.5, cy - 2], [10, cy - 5], [11.5, cy - 2]], K.white); break;
    case 'sun': p.disc(cx, cy, 3.5, c); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; p.put(Math.round(cx + Math.cos(an) * 6), Math.round(cy + Math.sin(an) * 6), c); } break;
    case 'palm': p.line(cx, cy + 6, cx + 1, cy - 3, C('#9a6034')); for (const [dx, dy] of [[-5, -1], [5, -1], [-4, -5], [4, -5], [0, -6]]) p.line(cx + 1, cy - 3, cx + 1 + dx, cy - 3 + dy + 2, c); break;
    case 'star': { const pts: [number, number][] = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? 2.4 : 5.5; pts.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); } p.poly(pts, c); break; }
    case 'bridge': p.hline(3, 20, cy + 2, c); for (const bx of [7, 16]) p.vline(bx, cy - 5, cy + 5, c); for (let x = 7; x <= 16; x++) p.put(x, Math.round(cy - 4 + ((x - 11.5) / 4.5) ** 2 * 4), c); break;
    case 'crown': p.poly([[cx - 5, cy + 3], [cx - 5, cy - 3], [cx - 2, cy], [cx, cy - 5], [cx + 2, cy], [cx + 5, cy - 3], [cx + 5, cy + 3]], c); break;
    case 'note': p.disc(cx - 2, cy + 3, 2.4, c); p.vline(cx, cy - 5, cy + 3, c); p.line(cx, cy - 5, cx + 4, cy - 2, c); break;
    case 'gate': p.hline(4, 19, cy - 4, c); p.hline(5, 18, cy - 2, c); p.vline(7, cy - 4, cy + 6, c); p.vline(16, cy - 4, cy + 6, c); p.put(3, cy - 5, c); p.put(20, cy - 5, c); break;
  }
  const ini = fitText((cityById[city]?.name.en ?? city).replace(/[_-]/g, ' ').split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase(), 14);
  drawText(p, ini, 12 - Math.round(textWidth(ini) / 2), 22 - 0, div === 2 ? K.white : K.white);
  p.outline(OUT28);
  return p;
}

export function cityCrestImg29(city: string, size = 24): HTMLImageElement {
  return pxImg28(`ccr29:${city}`, () => cityCrestPx29(city), size, (size * 28) / 24, { cls: 'crest29', title: cityById[city]?.name.en ?? city });
}

// ---------------------------------------------------------------- miniatura do horizonte

/** Horizonte 48×24 da cidade no ano (dia; à noite com janelas acesas se `night`). Reaproveita skyPlan27. */
export function skylineThumbPx29(city: string, year: number, night = false): Px {
  const W = 48, H = 24;
  const p = new Px(W, H);
  const plan = skyPlan27(city, year, W * 4, h28('sk29', city) & 0xfff, undefined, cityById[city]?.lat);
  const top = night ? C('#1a1838') : C('#7ab0e0'), bot = night ? C('#4a2a58') : C('#f0d8b0');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.put(x, y, dith(x, y, y / (H - 1)) ? bot : top);
  if (!night) p.disc(38, 6, 2.5, C('#fff2b0')); else p.disc(38, 5, 2, C('#f4f0e8'));
  // relevo distante
  if (plan.terr.length) for (let x = 0; x < W; x++) { const hh = 4 + Math.round(Math.sin(x * 0.18 + (h28('t29', city) % 7)) * 2 + Math.sin(x * 0.07) * 2); p.vline(x, H - 6 - hh, H - 1, mix(C('#6a8aa0'), top, 0.35)); }
  const sc = (H - 6) / Math.max(20, plan.hmax * 1.05);
  const wall = (L: number, tone: number) => { const base = L === 0 ? C('#8a92a8') : L === 1 ? C('#5a6280') : C('#3a3a50'); return night ? shade(base, -0.55 + tone * 0.1) : shade(base, -0.1 + tone * 0.2); };
  for (const L of [0, 1, 2] as const) for (const b of plan.blds) {
    if (b.layer !== L) continue;
    const x0 = Math.floor(b.x / 4), x1 = Math.ceil((b.x + b.w) / 4);
    const hh = Math.max(1, Math.round(b.h * sc * (L === 2 ? 0.7 : 1)));
    const col = wall(L, b.tone);
    for (let x = x0; x < x1; x++) { p.vline(x, H - 3 - hh, H - 3, col); if (night && (x + hh) % 2 === 0) for (let y = H - 2 - hh; y < H - 4; y += 2) if ((x * 7 + y) % 5 === 0) p.put(x, y, C('#ffd870')); }
    if (b.top === 'antenna' || b.top === 'crown') p.put(Math.round((x0 + x1) / 2), H - 4 - hh, col);
    if (b.top === 'pitch' || b.top === 'gable' || b.top === 'steep') p.hline(x0 + 1, x1 - 2, H - 4 - hh, col);
  }
  for (const a of plan.acc) {
    const x = Math.round(a.x / 4);
    const c = night ? C('#2a2838') : C('#4a5068');
    if (a.k === 'spire' || a.k === 'minaret' || a.k === 'tvmast') p.vline(x, H - 3 - (a.k === 'tvmast' ? 16 : 10), H - 3, c);
    else if (a.k === 'domech' || a.k === 'onion') { p.disc(x, H - 9, 2, c); p.vline(x, H - 12, H - 3, c); }
    else if (a.k === 'pagoda') for (let i = 0; i < 3; i++) p.hline(x - 3 + i, x + 3 - i, H - 5 - i * 3, c);
    else if (a.k === 'stack') { p.vline(x, H - 13, H - 3, c); p.put(x + 1, H - 15, withAlpha(K.lgrey, 160)); }
    else if (a.k === 'crane') { p.vline(x, H - 16, H - 3, C('#e0a030')); p.hline(x - 4, x + 6, H - 16, C('#e0a030')); }
  }
  // água ou rua
  if (plan.water) { for (let x = 0; x < W; x++) for (let y = H - 3; y < H; y++) p.put(x, y, (x + y) % 3 ? C('#3a6aa0') : C('#7ab0e0')); }
  else p.rect(0, H - 3, W, 3, night ? C('#26222c') : C('#5a5458'));
  p.outline(OUT28);
  return p;
}

export function skylineThumbImg29(city: string, year: number, w = 96): HTMLImageElement {
  const dec = Math.floor(year / 10) * 10;
  return pxImg28(`sk29:${city}:${dec}`, () => skylineThumbPx29(city, dec + 5), w, w / 2, { cls: 'sky29', title: cityById[city]?.name.en ?? city });
}

/** Região (reexporta para os testes e a folha). */
export const cityRegion29 = (city: string): Reg27 => region27(city);
