// Rodada 29 (ARTE) — OBJETOS no estilo antigo: EQUIPAMENTO LENDÁRIO do estúdio (24×24: microfone de fita, câmara de
// eco, placa de reverb, compressor valvulado, eco de fita, console, sala de pedra, bateria eletrônica, vocoder, mixador
// neural; o resto por palavras do nome), PRODUTO DE MERCHANDISING (24×24, com o logo do ato estampado: bótom, pôster,
// camiseta, patch, moletom, box de CDs, vinil colorido, ecobag, NFT, caixa de fã) e VEÍCULO DE TURNÊ (48×24 de perfil:
// perua/van, ônibus, avião — modelo da época). PURO e semeado; <img> memorizado em pxImg28.

import { logoColors, logoPx } from '../art';
import { drawText, fitText } from './font';
import { C, Px, dith, hsl, inked, mix, shade, withAlpha, type Col } from './px';
import { K28 as K, OUT28, h28, pxImg28 } from './art28kit';
import { relicBand28 } from './relic28';

// ---------------------------------------------------------------- equipamento do estúdio

export type Gear29 = 'ribbon' | 'chamber' | 'plate' | 'tubecomp' | 'tapeecho' | 'console' | 'gated' | 'drumbox' | 'vocoder' | 'neural' | 'mic' | 'amp' | 'synth' | 'tape' | 'monitor';
export const GEARS29: Gear29[] = ['ribbon', 'chamber', 'plate', 'tubecomp', 'tapeecho', 'console', 'gated', 'drumbox', 'vocoder', 'neural', 'mic', 'amp', 'synth', 'tape', 'monitor'];

/** Tipo de desenho pelo id do equipamento (music/data GEAR) ou palavras do nome. */
export function gearKindOf29(id: string, name = ''): Gear29 {
  const k = `${id} ${name}`.toLowerCase();
  if (/ribbon|fita "44"|g_ribbon/.test(k)) return 'ribbon';
  if (/chamber|câmara|camara/.test(k)) return 'chamber';
  if (/plate|placa/.test(k)) return 'plate';
  if (/tubecomp|compress/.test(k)) return 'tubecomp';
  if (/tapeecho|eco de fita|tape echo/.test(k)) return 'tapeecho';
  if (/console|mesa|desk/.test(k)) return 'console';
  if (/gated|pedra|stone/.test(k)) return 'gated';
  if (/808|drum machine|bateria eletr/.test(k)) return 'drumbox';
  if (/vocoder/.test(k)) return 'vocoder';
  if (/neural|ia\b|ai\b/.test(k)) return 'neural';
  if (/synth|sintet|moog|teclado/.test(k)) return 'synth';
  if (/amp|amplif/.test(k)) return 'amp';
  if (/tape|fita|gravador|reel/.test(k)) return 'tape';
  if (/monitor|caixa|speaker/.test(k)) return 'monitor';
  return 'mic';
}

const knob = (p: Px, x: number, y: number, c: Col = K.lgrey) => { p.put(x, y, c); p.put(x + 1, y, shade(c, -0.3)); };

export function gearPx29(kind: Gear29, seed = ''): Px {
  const N = 24;
  const p = new Px(N, N);
  const hue = h28('gr29', seed) % 360;
  switch (kind) {
    case 'ribbon': p.rect(8, 2, 8, 12, K.silver); for (let y = 3; y < 13; y++) if (y % 2) p.hline(9, 14, y, K.dsilver); p.rect(7, 6, 10, 3, K.lgrey); p.rect(11, 14, 2, 6, K.dgrey); p.rect(7, 20, 10, 2, K.dgrey); break;
    case 'mic': p.disc(12, 7, 4.5, K.dgrey); for (let y = 4; y < 11; y += 2) p.hline(9, 15, y, K.grey); p.rect(10, 11, 4, 6, K.black); p.rect(11, 17, 2, 4, K.dgrey); p.rect(7, 21, 10, 2, K.dgrey); break;
    case 'chamber': p.rect(2, 4, 20, 16, C('#8a8a8c')); for (let y = 5; y < 19; y += 3) p.hline(3, 20, y, C('#6e6e70')); p.rect(4, 8, 4, 8, K.black); p.disc(6, 11, 1.2, K.lgrey); p.rect(16, 8, 4, 8, K.black); p.disc(18, 11, 1.2, K.lgrey);
      for (let r = 2; r < 6; r += 2) for (let a = -0.6; a < 0.6; a += 0.3) p.put(Math.round(12 + Math.cos(a) * r - 3), Math.round(12 + Math.sin(a) * r), withAlpha(K.white, 160)); break;
    case 'plate': p.rect(1, 6, 22, 12, C('#5e3a1e')); p.rect(3, 8, 18, 8, C('#b8bcc8')); for (let x = 4; x < 20; x++) if ((x * 7) % 5 < 2) p.put(x, 9 + (x % 5), K.white); p.vline(2, 18, 21, K.dgrey); p.vline(21, 18, 21, K.dgrey); break;
    case 'tubecomp': p.rect(1, 9, 22, 10, C('#2a3a5a')); p.hline(1, 22, 9, C('#4a5a7a')); for (const x of [5, 10, 15]) { p.disc(x, 14, 2, K.lgrey); p.put(x, 13, K.ink); } p.rect(17, 11, 5, 5, K.cream); p.line(19, 15, 21, 12, K.red);
      for (const x of [6, 12, 18]) { p.rect(x - 1, 3, 3, 6, withAlpha(C('#f8c870'), 200)); p.put(x, 5, C('#ff8040')); } break;
    case 'tapeecho': p.rect(2, 8, 20, 12, C('#7a5a3a')); p.rect(3, 9, 18, 5, C('#d8c8a0')); p.disc(7, 11, 2, K.dgrey); p.disc(17, 11, 2, K.dgrey); p.hline(7, 17, 13, C('#3a2414'));
      for (const x of [5, 9, 13, 17]) knob(p, x, 16); drawText(p, 'ECHO', 4, 2, C('#7a5a3a')); break;
    case 'console': p.poly([[1, 20], [3, 8], [21, 8], [23, 20]], C('#4a4a50')); for (let x = 4; x < 21; x += 2) { p.vline(x, 9, 13, K.dgrey); p.put(x, 9 + (h28('fd', x, seed) % 4), K.white); p.put(x, 15, x % 4 ? C('#e04848') : C('#48b85c')); p.vline(x, 17, 19, K.lgrey); } p.rect(9, 4, 6, 4, K.black); p.line(10, 7, 13, 5, C('#48d870')); break;
    case 'gated': p.rect(1, 3, 22, 18, C('#9a9490')); for (let y = 3; y < 21; y += 4) for (let x = 1; x < 23; x++) if ((x + (y >> 2) * 3) % 6 === 0) p.vline(x, y, y + 3, C('#7a7470')); else if (y % 4 === 3) p.put(x, y, C('#7a7470'));
      p.ellipse(12, 16, 5, 2, C('#c8c8d0')); p.ring(12, 16, 3, K.dgrey); for (let i = 0; i < 4; i++) p.put(6 + i * 4, 8 - (i % 2), C('#f8e060')); break;
    case 'drumbox': p.rect(1, 6, 22, 14, C('#d8d0c0')); p.rect(1, 6, 22, 4, C('#3a3a40')); for (let i = 0; i < 8; i++) { const c = i < 2 ? C('#e04848') : i < 4 ? C('#f08a2c') : i < 6 ? C('#f8e060') : K.white; p.rect(2 + i * 2.6, 16, 2, 3, c); }
      for (let x = 3; x < 22; x += 3) knob(p, x, 12, K.dgrey); drawText(p, '808', 3, 7 - 1 + 1, C('#f08a2c')); break;
    case 'vocoder': p.rect(1, 10, 22, 10, C('#3a3a40')); for (let x = 2; x < 22; x++) p.vline(x, 17, 19, x % 2 ? K.white : K.ink); for (let x = 3; x < 21; x += 3) knob(p, x, 12, C('#e85ac8'));
      p.line(18, 10, 20, 4, K.dgrey); p.disc(20, 4, 2, K.dgrey); p.rect(4, 4, 8, 4, K.black); for (let x = 5; x < 11; x++) p.put(x, 6 + Math.round(Math.sin(x) * 1), C('#2ee8d8')); break;
    case 'neural': p.disc(12, 12, 9, C('#0a3a4a')); p.ring(12, 12, 9, C('#2ee8d8')); for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; const x = 12 + Math.cos(an) * 5, y = 12 + Math.sin(an) * 5; p.line(12, 12, Math.round(x), Math.round(y), withAlpha(C('#6ff8f0'), 180)); p.disc(x, y, 1.2, C('#e85ac8')); } p.disc(12, 12, 2, C('#e8fcff')); break;
    case 'amp': p.rect(3, 4, 18, 17, K.black); p.rect(4, 5, 16, 3, C('#c0a060')); for (let x = 6; x < 19; x += 3) knob(p, x, 6, K.ink); for (let y = 9; y < 20; y++) for (let x = 4; x < 20; x++) if ((x + y) % 2) p.put(x, y, C('#3a3438')); break;
    case 'synth': p.rect(1, 9, 22, 11, C('#6e4426')); p.rect(2, 10, 20, 4, K.black); for (let x = 3; x < 21; x += 2) knob(p, x, 11, K.white); for (let x = 2; x < 22; x++) p.vline(x, 15, 19, x % 3 === 0 ? K.ink : K.white); for (let x = 3; x < 21; x += 3) p.vline(x, 15, 17, K.ink); break;
    case 'tape': p.rect(2, 3, 20, 18, C('#8a8a90')); p.disc(7, 8, 4, K.dgrey); p.disc(17, 8, 4, K.dgrey); p.disc(7, 8, 1, K.lgrey); p.disc(17, 8, 1, K.lgrey); p.hline(7, 17, 13, C('#5e3a1e')); for (const x of [5, 9, 13, 17]) p.rect(x, 16, 3, 3, K.lgrey); break;
    case 'monitor': p.rect(5, 2, 14, 20, K.black); p.disc(12, 7, 3, K.dgrey); p.disc(12, 7, 1, K.grey); p.disc(12, 15, 5, K.dgrey); p.disc(12, 15, 2, hsl(hue, 30, 50)); break;
  }
  p.outline(OUT28);
  return p;
}

export function gearImg29(id: string, name = '', size = 24): HTMLImageElement {
  const k = gearKindOf29(id, name);
  return pxImg28(`gr29:${k}:${id}`, () => gearPx29(k, id), size, size, { cls: 'gear29', title: name });
}

// ---------------------------------------------------------------- merchandising

export type Merch29 = 'button' | 'poster' | 'tee' | 'patch' | 'hoodie' | 'cdbox' | 'color_vinyl' | 'tote' | 'nft' | 'fanbox' | 'cap' | 'mug';
export const MERCH29: Merch29[] = ['button', 'poster', 'tee', 'patch', 'hoodie', 'cdbox', 'color_vinyl', 'tote', 'nft', 'fanbox', 'cap', 'mug'];

/** Logo do ato reduzido (32 → n px) por amostragem do mais próximo. */
function stamp(p: Px, logo: Px, x0: number, y0: number, n: number): void {
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const c = logo.get(Math.floor((x + 0.5) * 32 / n), Math.floor((y + 0.5) * 32 / n)); if (c && c >>> 24 > 128) p.put(x0 + x, y0 + y, c); }
}

/** Produto 24×24 com o logo do ato (semente do logo, nome, gênero, ano). */
export function merchPx29(sku: string, logoSeed: number, act: string, genre: string, year: number): Px {
  const N = 24;
  const p = new Px(N, N);
  const lc = logoColors(logoSeed, genre, year);
  const logo = logoPx(logoSeed, act, genre, year);
  const cloth = mix(lc.bg, K.ink, 0.25);
  switch (sku as Merch29) {
    case 'button': p.disc(12, 12, 10, lc.bg); p.ring(12, 12, 10, shade(lc.bg, -0.4)); stamp(p, logo, 5, 5, 14); p.put(7, 5, withAlpha(K.white, 200)); break;
    case 'poster': p.rect(4, 1, 16, 22, K.cream); p.rect(5, 2, 14, 13, lc.bg); stamp(p, logo, 6, 3, 12); p.hline(6, 17, 17, lc.dark); p.hline(7, 15, 19, shade(K.cream, -0.3)); p.put(4, 1, K.lgrey); p.put(19, 1, K.lgrey); break;
    case 'tee': p.poly([[2, 6], [8, 2], [16, 2], [22, 6], [19, 10], [17, 9], [17, 22], [7, 22], [7, 9], [5, 10]], cloth); p.poly([[9, 2], [15, 2], [12, 5]], shade(cloth, -0.3)); stamp(p, logo, 8, 9, 8); break;
    case 'hoodie': p.poly([[2, 8], [7, 3], [17, 3], [22, 8], [20, 21], [17, 21], [17, 22], [7, 22], [7, 21], [4, 21]], cloth); p.disc(12, 4, 4, shade(cloth, -0.2)); p.rect(8, 16, 8, 4, shade(cloth, -0.15)); p.vline(10, 6, 10, K.white); p.vline(14, 6, 10, K.white); stamp(p, logo, 9, 8, 6); break;
    case 'patch': for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const d = Math.abs(x - 11.5) + Math.abs(y - 11.5); if (d <= 11) p.put(x, y, d > 9.5 ? lc.accent : lc.bg); } stamp(p, logo, 6, 6, 12); break;
    case 'cdbox': p.rect(3, 3, 18, 18, lc.dark); p.rect(4, 4, 14, 16, lc.bg); for (let i = 0; i < 4; i++) p.vline(19 + (i % 2), 4, 19, shade(lc.bg, -0.2 * i)); stamp(p, logo, 5, 6, 12); p.disc(18, 18, 3, K.silver); p.disc(18, 18, 1, K.ink); break;
    case 'color_vinyl': { const vc = hsl(lc.hue + 150, 75, 58); p.rect(1, 2, 16, 20, lc.bg); stamp(p, logo, 3, 6, 12); p.disc(15, 12, 8.5, vc); for (let r = 3; r < 8; r += 2) p.ring(15, 12, r, shade(vc, -0.15)); p.disc(15, 12, 2.5, lc.fg); p.put(15, 12, K.ink); p.put(11, 8, withAlpha(K.white, 200)); break; }
    case 'tote': p.rect(4, 8, 16, 15, C('#e8dcc0')); p.ring(12, 8, 4, C('#c8b890')); p.rect(8, 8, 9, 2, 0); p.rect(4, 8, 16, 1, C('#d0c4a0')); stamp(p, logo, 7, 11, 10); break;
    case 'nft': for (let y = 2; y < 22; y++) for (let x = 2; x < 22; x++) p.put(x, y, dith(x, y, (x + y) / 44) ? hsl(lc.hue + 40, 80, 55) : hsl(lc.hue + 200, 80, 45)); stamp(p, logo, 6, 6, 12); for (let x = 2; x < 22; x++) { p.put(x, 2, C('#2ee8d8')); p.put(x, 21, C('#e85ac8')); } for (let y = 2; y < 22; y++) { p.put(2, y, C('#2ee8d8')); p.put(21, y, C('#e85ac8')); } break;
    case 'fanbox': p.poly([[2, 9], [12, 5], [22, 9], [12, 13]], shade(lc.bg, 0.2)); p.poly([[2, 9], [12, 13], [12, 23], [2, 19]], lc.bg); p.poly([[22, 9], [12, 13], [12, 23], [22, 19]], shade(lc.bg, -0.25)); stamp(p, logo, 3, 12, 8); p.line(12, 5, 12, 13, lc.accent); p.line(7, 7, 17, 11, lc.accent); break;
    case 'cap': p.ellipse(12, 12, 8, 7, cloth); p.rect(4, 12, 17, 6, 0); p.ellipse(14, 13, 10, 2, shade(cloth, -0.2)); stamp(p, logo, 8, 6, 7); p.put(12, 5, shade(cloth, 0.3)); break;
    case 'mug': p.rect(4, 6, 13, 15, K.white); p.ring(18, 13, 3.5, K.lgrey); p.rect(4, 6, 13, 2, K.lgrey); stamp(p, logo, 6, 9, 9); for (let i = 0; i < 3; i++) p.put(8 + i * 2, 3 - (i % 2), withAlpha(K.lgrey, 150)); break;
    default: p.rect(4, 4, 16, 16, lc.bg); stamp(p, logo, 6, 6, 12);
  }
  p.outline(OUT28);
  return p;
}

export function merchImg29(sku: string, logoSeed: number, act: string, genre: string, year: number, size = 24): HTMLImageElement {
  return pxImg28(`mr29:${sku}:${logoSeed}:${act}:${Math.floor(year / 5)}`, () => merchPx29(sku, logoSeed, act, genre, year), size, size, { cls: 'merch29' });
}

// ---------------------------------------------------------------- veículo de turnê

export type Move29 = 'van' | 'bus' | 'fly';
/** Veículo 48×24 de perfil, no modelo da época (perua → Kombi → van; ônibus de linha → Silver Eagle → ônibus-leito; DC-3 → jato → jatinho). */
export function vehiclePx29(move: Move29, year: number, seed = ''): Px {
  const W = 48, H = 24;
  const p = new Px(W, H);
  const b = relicBand28(year);
  const hue = h28('vh29', seed) % 360;
  const body = b <= 1 ? hsl(hue, 45, 42) : b === 2 ? hsl(hue, 60, 55) : b === 3 ? K.white : b === 4 ? K.black : C('#d8dce4');
  const glass = C('#8ac0e0');
  // R29 (arte consistente): o fundo (céu/chão) ocupa o quadro inteiro, então o contorno do Px não achava borda —
  // o veículo agora vai numa camada própria, com relevo pela silhueta e contorno INK
  p.rect(0, 21, W, 3, C('#5c5856'));
  if (move === 'fly') { p.rect(0, 0, W, 21, C('#9ac8e8')); p.rect(0, 21, W, 3, C('#7a7a80')); }
  inked(p, (v) => {
    const wheel = (cx: number, cy: number, r = 3) => { v.disc(cx, cy, r, K.ink); v.disc(cx, cy, r - 1.5, K.grey); v.put(Math.floor(cx) - 1, Math.floor(cy) - 1, K.white); };
    if (move === 'fly') {
      const prop = b <= 1;
      v.ellipse(24, 12, 20, 4, b >= 4 ? K.white : K.silver);
      v.poly([[42, 12], [47, 4], [47, 12]], hsl(hue, 70, 45));
      v.poly([[20, 12], [30, 12], [22, 20], [16, 20]], shade(K.silver, -0.15));
      for (let x = 10; x < 38; x += 3) v.put(x, 11, glass);
      v.poly([[4, 11], [8, 9], [8, 13]], glass);
      if (prop) { v.vline(3, 8, 16, K.dgrey); v.rect(20, 14, 3, 2, K.dgrey); } else v.rect(22, 16, 6, 3, K.dgrey);
      v.hline(6, 42, 13, hsl(hue, 70, 45));
      if (b >= 4) { drawText(v, fitText(seed.toUpperCase(), 12), 30, 8, hsl(hue, 70, 45)); }
    } else if (move === 'bus') {
      const L = b <= 1 ? 40 : 46;
      v.rect(1, 5, L, 14, body);
      if (b <= 1) { v.poly([[1, 5], [5, 2], [L - 4, 2], [L + 1, 5]], body); v.hline(2, L - 2, 10, hsl(hue + 180, 50, 40)); }
      else if (b === 2) for (let x = 1; x < L + 1; x += 2) v.vline(x, 12, 18, K.silver);
      else if (b >= 4) v.hline(1, L, 15, hsl(hue, 80, 50));
      for (let x = 4; x < L - 4; x += 5) v.rect(x, 7, 4, 4, b >= 4 ? K.black : glass);
      v.rect(L - 3, 6, 3, 7, glass);
      wheel(8, 19); wheel(L - 8, 19); if (b >= 2) wheel(L - 14, 19);
      if (b >= 3) { const t = fitText('TOUR', 18); drawText(v, t, 6, 13 - 1, b >= 4 ? K.white : hsl(hue, 70, 40)); }
    } else {
      if (b <= 1) { // perua/rabo de peixe com reboque
        v.rect(14, 10, 26, 8, body); v.poly([[19, 10], [23, 5], [34, 5], [37, 10]], body); v.rect(24, 6, 4, 4, glass); v.rect(30, 6, 4, 4, glass); v.rect(1, 9, 11, 9, C('#9a6a3c')); v.hline(12, 14, 15, K.dgrey); wheel(19, 19); wheel(35, 19); wheel(6, 19);
      } else if (b === 2) { // kombi
        v.rect(6, 5, 34, 14, body); v.rect(6, 5, 34, 6, K.white); v.poly([[40, 5], [43, 8], [43, 19], [40, 19]], body); v.poly([[40, 5], [43, 8], [43, 11], [40, 11]], K.white);
        for (let x = 9; x < 38; x += 6) v.rect(x, 6, 4, 4, glass); v.poly([[23, 12], [27, 12], [25, 15]], K.white); wheel(13, 19); wheel(35, 19);
        for (let i = 0; i < 4; i++) v.put(10 + i * 7, 15, hsl(hue + i * 60, 80, 60));
      } else { // van de turnê
        v.rect(4, 6, 36, 13, body); v.poly([[40, 9], [45, 12], [45, 19], [40, 19]], body); v.rect(40, 10, 3, 3, glass); v.rect(34, 8, 5, 4, glass); v.hline(4, 39, 15, hsl(hue, 70, 45)); wheel(11, 19); wheel(37, 19);
        if (b >= 4) v.rect(6, 4, 30, 2, K.dgrey);
      }
    }
  }, OUT28, { relief: true });
  return p;
}

export function vehicleImg29(move: Move29, year: number, seed = '', w = 72): HTMLImageElement {
  return pxImg28(`vh29:${move}:${relicBand28(year)}:${seed}`, () => vehiclePx29(move, year, seed), w, w / 2, { cls: 'vehicle29' });
}
