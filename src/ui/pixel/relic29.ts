// Rodada 29 (ARTE) — mais RELÍQUIAS (24×24, mesmo estilo de relic28): banjo, sanfona, gaita, cavaquinho/ukulele,
// cítara/alaúde, rádio-gravador (boombox), walkman/discman, credencial de bastidor, palheta, pandeiro, panfleto de
// festa, sampler (MPC), keytar, letreiro de neon, telefone (de disco → tijolão → celular) e lenço/bandana.
// Escolha pelo NOME da peça (palavras em pt/en); peça genérica ("objeto de cena") ganha um destes pela época
// em parte dos casos. Quem não casa segue no desenho da rodada 28. Puro e semeado.

import { drawText, fitText, textWidth } from './font';
import { C, Px, hsl, shade, withAlpha } from './px';
import { K28 as K, OUT28, h28 } from './art28kit';
import { relicBand28 } from './relic28';

export const RELIC_ARTS29 = ['banjo', 'accordion', 'harmonica', 'cavaquinho', 'sitar', 'boombox', 'walkman', 'pass', 'pick', 'pandeiro', 'flyer', 'sampler', 'keytar', 'neonsign', 'phone', 'scarf'] as const;
export type RelicArt29 = (typeof RELIC_ARTS29)[number];

const RULES: [RegExp, RelicArt29][] = [
  [/banjo/, 'banjo'], [/accordion|sanfona|acordeão|acordeao|acordeón|bandoneon|bandoneón/, 'accordion'], [/harmonica|gaita de boca|\bgaita\b|blues harp/, 'harmonica'],
  [/cavaquinho|ukulele|\buke\b|charango/, 'cavaquinho'], [/sitar|cítara|citara|\boud\b|bouzouki|buzuqui|alaúde|alaude/, 'sitar'], [/boombox|ghetto blaster|rádio-gravador|radio-gravador|boom box/, 'boombox'],
  [/walkman|discman|ipod|mp3/, 'walkman'], [/backstage|laminate|credencial|crachá|cracha|all access|\bpass\b/, 'pass'], [/\bpick\b|palheta|plectr/, 'pick'],
  [/pandeiro|tamborim|tambourine|pandeireta/, 'pandeiro'], [/flyer|panfleto|filipeta/, 'flyer'], [/\bmpc\b|sampler|sp-1200|sp1200/, 'sampler'], [/keytar/, 'keytar'],
  [/\bneon\b|letreiro|marquee sign/, 'neonsign'], [/phone|telefone|celular|orelhão|orelhao/, 'phone'], [/scarf|lenço|lenco|bandana/, 'scarf'],
];

/** Desenho novo pela palavra do nome; ou, para peça genérica da rodada 28 ('prop'), um objeto da época (≈55%). */
export function relicArtOf29(kind: string, name: string, year: number, seed = '', art28 = ''): RelicArt29 | null {
  const n = name.toLowerCase();
  for (const [re, a] of RULES) if (re.test(n)) return a;
  if (art28 === 'prop' && h28('r29p', seed, name) % 100 < 55) {
    const b = relicBand28(year);
    const pool: RelicArt29[] = b <= 1 ? ['phone', 'scarf', 'harmonica', 'banjo'] : b === 2 ? ['scarf', 'neonsign', 'phone', 'pick'] : b === 3 ? ['boombox', 'walkman', 'pass', 'flyer', 'keytar'] : ['pass', 'sampler', 'flyer', 'neonsign', 'phone'];
    return pool[h28('r29q', seed, name) % pool.length];
  }
  void kind;
  return null;
}

export function relicPx29(art: RelicArt29, seed: string, year: number, name = ''): Px {
  const N = 24;
  const p = new Px(N, N);
  const b = relicBand28(year);
  const hue = h28('r29h', seed) % 360;
  const wood = K.wood, dw = K.dwood;
  switch (art) {
    case 'banjo': p.disc(8, 16, 6.5, K.silver); p.disc(8, 16, 5.3, K.cream); p.ring(8, 16, 5.3, K.dsilver); p.line(12, 12, 21, 3, dw); p.line(13, 12, 22, 3, wood); p.rect(20, 1, 3, 3, dw); p.line(4, 16, 21, 3, withAlpha(K.lgrey, 160)); break;
    case 'accordion': p.rect(2, 6, 6, 13, hsl(hue, 70, 40)); p.rect(16, 6, 6, 13, hsl(hue, 70, 40)); for (let x = 8; x < 16; x++) p.vline(x, 6 + (x % 2), 18 - (x % 2), x % 2 ? K.black : shade(K.black, 0.3)); for (let y = 8; y < 17; y += 2) { p.put(4, y, K.white); p.put(6, y, K.white); p.put(18, y, K.cream); } p.rect(16, 6, 2, 13, K.white); break;
    case 'harmonica': p.rect(2, 9, 20, 6, K.silver); p.hline(2, 21, 9, K.white); p.hline(2, 21, 14, K.dsilver); p.rect(3, 11, 18, 2, dw); for (let x = 4; x < 21; x += 2) p.put(x, 11, K.ink); drawText(p, 'C', 19, 3, K.gold); break;
    case 'cavaquinho': p.ellipse(8, 16, 5, 6, wood); p.disc(8, 14, 1.5, dw); p.ellipse(8, 19, 3, 2, shade(wood, 0.15)); p.line(10, 11, 20, 2, dw); p.line(11, 11, 21, 2, dw); p.rect(19, 0, 4, 3, dw); break;
    case 'sitar': p.disc(6, 18, 5, C('#c08040')); p.disc(6, 18, 3, shade(C('#c08040'), -0.2)); p.line(8, 14, 21, 1, dw); p.line(9, 15, 22, 2, wood); p.disc(18, 5, 2.5, C('#c08040')); for (let i = 0; i < 4; i++) p.put(11 + i * 2, 11 - i * 2, K.gold); break;
    case 'boombox': p.rect(1, 8, 22, 13, b >= 3 ? K.dgrey : K.grey); p.rect(4, 4, 16, 2, K.silver); p.vline(4, 4, 8, K.silver); p.vline(19, 4, 8, K.silver); p.disc(6, 15, 4, K.black); p.disc(18, 15, 4, K.black); p.disc(6, 15, 1.5, K.grey); p.disc(18, 15, 1.5, K.grey); p.rect(10, 11, 4, 4, K.ink); p.rect(10, 16, 4, 3, K.silver); for (let x = 3; x < 22; x += 3) p.put(x, 9, hsl(hue + x * 20, 80, 60)); break;
    case 'walkman': if (b <= 3) { p.rect(5, 3, 14, 18, hsl(hue, 50, 40)); p.rect(7, 6, 10, 7, K.ink); p.disc(9, 9.5, 1.5, K.white); p.disc(15, 9.5, 1.5, K.white); p.rect(7, 15, 3, 2, K.lgrey); p.rect(11, 15, 3, 2, K.lgrey); } else { p.rect(7, 2, 10, 20, K.white); p.disc(12, 15, 3.5, K.lgrey); p.disc(12, 15, 1.2, K.white); p.rect(8, 4, 8, 7, C('#3a6ab0')); } for (let x = 1; x < 6; x++) p.put(x, 12 + Math.round(Math.sin(x) * 2), K.dgrey); break;
    case 'pass': p.line(8, 0, 10, 6, hsl(hue, 70, 50)); p.line(16, 0, 14, 6, hsl(hue, 70, 50)); p.rect(5, 6, 14, 17, K.white); p.rect(5, 6, 14, 5, hsl(hue, 70, 45)); drawText(p, fitText('ALL', 12), 12 - Math.round(textWidth('ALL') / 2), 7 - 1 + 1, K.white); drawText(p, 'ACC', 12 - Math.round(textWidth('ACC') / 2), 14, K.ink); p.rect(7, 20, 10, 1, hsl(hue + 160, 70, 50)); break;
    case 'pick': p.poly([[4, 5], [20, 5], [12, 21]], hsl(hue, 75, 50)); p.disc(7, 7, 3, hsl(hue, 75, 50)); p.disc(17, 7, 3, hsl(hue, 75, 50)); p.put(8, 7, withAlpha(K.white, 200)); drawText(p, fitText(name.slice(0, 1).toUpperCase() || 'M', 4), 11, 9, shade(hsl(hue, 75, 50), -0.5)); break;
    case 'pandeiro': p.disc(12, 12, 10, wood); p.disc(12, 12, 8.5, K.cream); for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; p.rect(Math.round(12 + Math.cos(an) * 9.3) - 1, Math.round(12 + Math.sin(an) * 9.3) - 1, 2, 2, K.silver); } p.put(9, 9, K.white); break;
    case 'flyer': p.rect(4, 1, 16, 22, b >= 3 ? hsl(hue, 85, 55) : K.cream); p.disc(12, 9, 5, K.yellow); p.put(10, 8, K.ink); p.put(14, 8, K.ink); p.line(10, 11, 14, 11, K.ink); p.put(9, 10, K.ink); p.put(15, 10, K.ink); for (let y = 16; y < 22; y += 2) p.hline(6, 17 - (y % 4), y, K.ink); break;
    case 'sampler': p.rect(2, 4, 20, 17, K.dgrey); p.rect(4, 6, 8, 4, C('#7ac0a0')); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) p.rect(4 + i * 4, 11 + j * 2.5, 3, 2, i === 0 && j === 0 ? C('#e04848') : K.lgrey); for (const x of [15, 18]) p.disc(x, 7, 1.3, K.ink); break;
    case 'keytar': p.poly([[1, 18], [16, 6], [22, 8], [8, 20]], hsl(hue, 70, 50)); for (let i = 0; i < 9; i++) p.line(5 + i, 16 - i, 7 + i, 18 - i, i % 2 ? K.white : K.ink); p.rect(17, 5, 5, 3, K.black); break;
    case 'neonsign': p.rect(1, 4, 22, 15, C('#141018')); { const nc = hsl(hue, 95, 64); const t = fitText((name.split(/\s+/)[0] || 'OPEN').toUpperCase(), 18); drawText(p, t, 12 - Math.round(textWidth(t) / 2), 9, nc); p.hline(3, 20, 6, withAlpha(nc, 140)); p.hline(3, 20, 16, withAlpha(nc, 140)); } p.vline(6, 0, 4, K.dgrey); p.vline(17, 0, 4, K.dgrey); break;
    case 'phone': if (b <= 2) { p.rect(4, 12, 16, 9, K.black); p.disc(12, 16, 3.5, K.dgrey); p.disc(12, 16, 1, K.black); p.rect(3, 7, 18, 3, K.black); p.rect(3, 6, 4, 3, K.black); p.rect(17, 6, 4, 3, K.black); } else if (b === 3) { p.rect(8, 4, 8, 18, K.dgrey); p.vline(14, 0, 4, K.black); p.rect(9, 6, 6, 3, C('#7ac0a0')); for (let y = 11; y < 20; y += 2) p.hline(9, 14, y, K.lgrey); } else { p.rect(7, 2, 10, 20, K.black); p.rect(8, 4, 8, 15, hsl(hue, 60, 55)); p.put(12, 20, K.dgrey); } break;
    case 'scarf': for (let y = 3; y < 21; y++) { const x0 = 6 + Math.round(Math.sin(y * 0.5) * 3); p.hline(x0, x0 + 8, y, (y >> 1) % 2 ? hsl(hue, 70, 48) : K.white); } for (let x = 6; x < 18; x += 2) p.vline(x + Math.round(Math.sin(21 * 0.5) * 3), 21, 23, hsl(hue, 70, 48)); break;
  }
  p.outline(OUT28);
  return p;
}
