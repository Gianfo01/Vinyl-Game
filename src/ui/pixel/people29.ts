// Rodada 29 (ARTE) — PESSOAS DE BASTIDOR e FOTOS DE BANDA, sobre o retrato de busto de avatar.ts (mesmo estilo):
//   • RETRATO DE EQUIPE (32×32): o busto da pessoa + o adereço da função na época (produtor com fones, técnico com
//     headset, empresário com telefone — de gancho → tijolão → smartphone —, crítico com bloquinho, advogado com
//     gravata e pasta, olheiro com fita demo, divulgador com crachá, executivo com caneta de ouro, DJ com fone no
//     pescoço) e o fundo na cor do ofício;
//   • FOTO DA BANDA (W×H): os integrantes lado a lado, com o tratamento de foto da época (P&B granulado, cor
//     desbotada dos 70, saturada dos 80, granulada dos 90, nítida depois; meio-tom de fotocópia para fanzine).
// Funções reutilizáveis pela equipe de cenas (cut27): `staffPortraitPx29`, `bandPhotoPx29`, `photoTreat29`.
// Tudo PURO e determinístico; <img> memorizado.

import type { Appearance } from '../../sim/types';
import { C, Px, dith, hsl, mix, noise, shade, withAlpha, type Col } from './px';
import { K28 as K, OUT28, h28, pxImg28 } from './art28kit';
import { relicBand28 } from './relic28';
import { portraitPx } from './avatar';

type PersonLike = { id: string; look?: Appearance; born?: number; role?: never };

export type Staff29 = 'producer' | 'engineer' | 'manager' | 'critic' | 'lawyer' | 'scout' | 'publicist' | 'exec' | 'dj' | 'agent';
export const STAFF29: Staff29[] = ['producer', 'engineer', 'manager', 'critic', 'lawyer', 'scout', 'publicist', 'exec', 'dj', 'agent'];

/** Função de bastidor a partir de um texto livre (papel do funcionário, cargo, tipo de remetente). */
export function staffRoleOf29(s: string): Staff29 {
  const k = s.toLowerCase();
  if (/produt|producer/.test(k)) return 'producer';
  if (/técn|tecn|engineer|engenh|mix|som\b/.test(k)) return 'engineer';
  if (/critic|crític|jornal|review|imprensa|press/.test(k)) return 'critic';
  if (/advog|lawyer|jur|legal|attorney/.test(k)) return 'lawyer';
  if (/olheir|scout|a&r|talent/.test(k)) return 'scout';
  if (/divulg|publicist|promot|pr\b|marketing/.test(k)) return 'publicist';
  if (/dj\b|disc.?jockey|radialista/.test(k)) return 'dj';
  if (/agent|booking|agência|agencia/.test(k)) return 'agent';
  if (/ceo|exec|presid|diretor|director|dono|owner|boss|chefe/.test(k)) return 'exec';
  return 'manager';
}

const BG29: Record<Staff29, number> = { producer: 200, engineer: 170, manager: 30, critic: 50, lawyer: 220, scout: 120, publicist: 330, exec: 260, dj: 285, agent: 10 };

/** Adereço da função por cima do busto (coordenadas do retrato 32×32 de avatar.ts: cabeça em x 8–24, y 6–24). */
function prop(p: Px, k: Staff29, b: number, hue: number): void {
  const blk = K.black, dk = K.dgrey;
  switch (k) {
    case 'producer': { // fones de ouvido grandes
      for (let x = 9; x <= 22; x++) { const y = Math.round(6 - Math.sin(((x - 9) / 13) * Math.PI) * 3) + 1; p.put(x, y, dk); }
      p.rect(7, 12, 3, 6, blk); p.rect(22, 12, 3, 6, blk); p.put(8, 13, hsl(hue, 70, 55)); p.put(23, 13, hsl(hue, 70, 55));
      break;
    }
    case 'engineer': // headset com microfone
      for (let x = 9; x <= 22; x++) p.put(x, Math.round(6 - Math.sin(((x - 9) / 13) * Math.PI) * 3) + 1, dk);
      p.rect(22, 12, 2, 4, blk); p.line(22, 16, 18, 20, dk); p.put(17, 20, blk); p.put(18, 20, blk);
      break;
    case 'manager': // telefone na orelha (gancho → tijolão → smartphone)
      if (b <= 2) { p.rect(22, 9, 3, 9, blk); p.rect(21, 8, 4, 2, blk); p.rect(21, 17, 4, 2, blk); for (let y = 19; y < 30; y += 2) p.put(25 + (y % 4 === 1 ? 1 : 0), y, dk); }
      else if (b === 3) { p.rect(22, 8, 4, 12, C('#2a2a30')); p.vline(24, 3, 8, dk); for (let y = 13; y < 19; y += 2) p.hline(23, 24, y, K.grey); }
      else { p.rect(22, 9, 3, 7, C('#1e1e24')); p.rect(23, 10, 1, 5, withAlpha(C('#8ac8ff'), 220)); }
      break;
    case 'critic': // bloquinho e caneta na frente
      p.rect(4, 22, 9, 10, K.paper); for (let y = 24; y < 31; y += 2) p.hline(5, 11, y, withAlpha(K.dgrey, 160)); p.hline(4, 12, 22, C('#c83030'));
      p.line(13, 31, 17, 24, b >= 4 ? K.silver : C('#2a4ab0')); p.put(17, 24, K.ink);
      break;
    case 'lawyer': // gravata escura e pasta
      p.rect(15, 24, 2, 7, C('#1e2a50')); p.put(15, 24, C('#2c3a6a')); p.put(16, 24, C('#2c3a6a'));
      p.rect(22, 25, 9, 7, C('#5e3a1e')); p.hline(22, 30, 25, C('#7a4e2a')); p.rect(25, 23, 3, 2, C('#3a2414')); p.put(26, 28, K.gold);
      break;
    case 'scout': { // fita demo na mão (cassete / CD-R / pendrive)
      if (b <= 1) { p.disc(25, 27, 4, C('#2a2628')); p.disc(25, 27, 1.5, K.cream); }
      else if (b <= 3) { p.rect(20, 24, 11, 7, C('#2a2628')); p.rect(21, 25, 9, 3, K.cream); p.put(23, 29, K.white); p.put(28, 29, K.white); }
      else { p.disc(25, 27, 4, K.silver); p.disc(25, 27, 1.2, K.ink); p.line(22, 25, 27, 29, withAlpha(C('#2a2628'), 180)); }
      break;
    }
    case 'publicist': // crachá no cordão
      p.line(12, 24, 15, 29, hsl(hue, 70, 50)); p.line(20, 24, 17, 29, hsl(hue, 70, 50)); p.rect(14, 29, 5, 3, K.white); p.hline(14, 18, 29, hsl(hue, 70, 50));
      break;
    case 'exec': // gravata vermelha, lenço no bolso e caneta de ouro
      p.rect(15, 24, 2, 7, C('#a02020')); p.rect(20, 27, 3, 2, K.white); p.vline(10, 26, 30, K.gold);
      if (b <= 2) { p.line(19, 20, 24, 21, C('#7a4a2a')); p.put(25, 21, C('#f08a2c')); p.put(26, 19, withAlpha(K.lgrey, 160)); }
      break;
    case 'dj': // fone no pescoço
      for (let x = 10; x <= 21; x++) p.put(x, Math.round(23 + Math.sin(((x - 10) / 11) * Math.PI) * 2), dk);
      p.rect(8, 22, 3, 4, blk); p.rect(21, 22, 3, 4, blk);
      break;
    case 'agent': // óculos escuros e lapela
      p.rect(10, 13, 5, 3, blk); p.rect(17, 13, 5, 3, blk); p.hline(15, 16, 13, blk); p.put(11, 13, withAlpha(K.white, 120)); p.put(18, 13, withAlpha(K.white, 120));
      p.put(12, 26, K.gold);
      break;
  }
}

/** Cores da placa de fundo do retrato de avatar.ts (bgA no topo e bgB = sombra pontilhada embaixo). */
function plate(por: Px): Set<Col> { const a = por.get(1, 10); return new Set([a, shade(a, -0.18)]); }

/** Retrato 32×32 de bastidor: busto da pessoa (avatar.ts) + adereço da função + fundo na cor do ofício. */
export function staffPortraitPx29(person: PersonLike, role: Staff29, year: number): Px {
  const base = portraitPx(person, year);
  const p = new Px(32, 32);
  const hue = (BG29[role] + (h28('stb29', person.id) % 24)) % 360;
  const a = hsl(hue, 30, 62), b = hsl(hue, 34, 50);
  // fundo novo onde o retrato tinha o fundo (mesma placa arredondada)
  const bg = plate(base);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const c = base.get(x, y);
    if (!c) continue;
    p.put(x, y, bg.has(c) ? (y > 20 && dith(x, y, (y - 20) / 14) ? b : a) : c);
  }
  prop(p, role, relicBand28(year), hue);
  p.outline(OUT28);
  return p;
}

export function staffPortraitImg29(person: PersonLike, role: Staff29, year: number, size = 32): HTMLImageElement {
  return pxImg28(`sp29:${person.id}:${role}:${relicBand28(year)}:${Math.floor(year / 10)}`, () => staffPortraitPx29(person, role, year), size, size, { cls: 'staff29 portrait' });
}

// ---------------------------------------------------------------- foto da banda

export type Photo29 = 'bw' | 'faded' | 'vivid' | 'grain' | 'crisp' | 'halftone';
export const PHOTOS29: Photo29[] = ['bw', 'faded', 'vivid', 'grain', 'crisp', 'halftone'];
export const photoOf29 = (year: number): Photo29 => (year < 1966 ? 'bw' : year < 1980 ? 'faded' : year < 1990 ? 'vivid' : year < 2002 ? 'grain' : 'crisp');

const lum = (c: Col): number => ((c & 255) * 0.3 + ((c >>> 8) & 255) * 0.59 + ((c >>> 16) & 255) * 0.11) / 255;

/** Tratamento de foto da época sobre uma imagem pronta (no lugar). Útil também para cenas. */
export function photoTreat29(p: Px, kind: Photo29, seed = 0, tintHue = 30): void {
  p.map((c, x, y) => {
    if (!c || c >>> 24 < 40) return c;
    const L = lum(c);
    const n = noise(x, y, seed);
    switch (kind) {
      case 'bw': { const v = Math.max(0, Math.min(1, (L - 0.12) / 0.7 + (n - 0.5) * 0.06)); return mix(C('#1e1a1a'), C('#ece6da'), Math.round(v * 7) / 7); }
      case 'faded': return mix(mix(c, hsl(tintHue, 55, 62), 0.28), C('#f0e0c0'), 0.12);
      case 'vivid': { const [r, g, b] = [c & 255, (c >>> 8) & 255, (c >>> 16) & 255]; const m = (r + g + b) / 3; const k = 1.35; const f = (v: number) => Math.max(0, Math.min(255, m + (v - m) * k)); return (0xff000000 | (f(b) << 16) | (f(g) << 8) | f(r)) >>> 0; }
      case 'grain': return n < 0.12 ? shade(c, -0.25) : n > 0.9 ? shade(c, 0.18) : mix(c, C('#506070'), 0.1);
      case 'crisp': return c;
      case 'halftone': { const v = Math.max(0, Math.min(1, (L - 0.15) / 0.6)); return v < 0.35 || (v < 0.62 && (x + y) % 2 === 0) ? K.ink : K.white; }
    }
    return c;
  });
}

/**
 * Foto da banda W×H: até 5 integrantes (bustos do retrato de avatar.ts) lado a lado, de trás para a frente,
 * contra um fundo da época (parede de tijolo, estúdio, rua, céu), com o tratamento de foto.
 */
export function bandPhotoPx29(members: PersonLike[], year: number, W = 40, H = 30, kind: Photo29 = photoOf29(year), seed = 0, cutout = false): Px {
  const p = new Px(W, H);
  const bgK = h28('bp29', seed) % 4;
  const hue = h28('bph29', seed) % 360;
  if (!cutout) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c: Col;
    if (bgK === 0) c = (y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0) ? C('#7a3a2a') : C('#a8523a'); // tijolo
    else if (bgK === 1) c = dith(x, y, y / H) ? hsl(hue, 30, 30) : hsl(hue, 30, 42); // fundo de estúdio
    else if (bgK === 2) c = y < H * 0.55 ? (dith(x, y, y / (H * 0.55)) ? C('#c8dcf0') : C('#8ab8e0')) : C('#7a7470'); // rua
    else c = noise(x >> 2, y >> 2, seed) < 0.5 ? C('#d8d0c0') : C('#c8c0b0'); // muro claro
    p.put(x, y, c);
  }
  const ms = members.slice(0, 5);
  const n = Math.max(1, ms.length);
  // escala do busto: 1 integrante = foto de retrato maior
  const sc = n === 1 ? Math.min(1.1, (H + 2) / 32) : n === 2 ? 0.9 : n <= 3 ? 0.78 : 0.68;
  const bw = 32 * sc;
  const step = n === 1 ? 0 : Math.min(bw * 0.78, (W - bw) / (n - 1));
  const x0 = Math.round((W - (bw + step * (n - 1))) / 2);
  // ordem: os das pontas atrás (um pouco mais acima), o do meio na frente
  const order = ms.map((m, i) => ({ m, i, z: -Math.abs(i - (n - 1) / 2) })).sort((a, b) => a.z - b.z);
  for (const { m, i, z } of order) {
    const por = portraitPx(m, year);
    const ox = Math.round(x0 + i * step), oy = H - Math.round(32 * sc) + Math.round(-z * 1.5) + 1;
    const S = Math.round(32 * sc);
    const bg = plate(por);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const c = por.get(Math.floor(x / sc), Math.floor(y / sc));
      if (!c || c >>> 24 < 200) continue;
      if (bg.has(c)) continue; // sem a placa de fundo do retrato
      p.put(ox + x, oy + y, c);
    }
  }
  if (!cutout) photoTreat29(p, kind, seed, hue); // recorte (cutout): só as pessoas, fundo transparente
  return p;
}

/** Integrantes procedurais coerentes (quando não há o ato à mão): 1–4 pessoas pela semente. */
export function fakeMembers29(seed: string, n?: number): PersonLike[] {
  const k = n ?? 1 + (h28('fm29', seed) % 4);
  return Array.from({ length: k }, (_, i) => ({ id: `${seed}#m${i}` }));
}

export function bandPhotoImg29(members: PersonLike[], year: number, seed = 0, w = 120): HTMLImageElement {
  const key = `bp29:${members.map((m) => m.id).join(',')}:${Math.floor(year / 5)}:${seed}`;
  return pxImg28(key, () => { const q = bandPhotoPx29(members, year, 40, 30, photoOf29(year), seed); q.outline(OUT28); return q; }, w, (w * 30) / 40, { cls: 'bandphoto29' });
}
