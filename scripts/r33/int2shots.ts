// R33 · INT-2 — prints dos prédios novos e das lojas da época: um PNG por lugar com a fachada e o interior em cada época em que
// o lugar existe (1962, 2025 e, quando existe, 1895 e 2035). Uso: npx tsx scripts/r33/int2shots.ts  → docs/r33/mocks/int2/*.png
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { Px } from '../../src/ui/pixel/px';
import { drawTextOutlined } from '../../src/ui/pixel/font';
import { C } from '../../src/ui/pixel/px';
import { FACADE_H, FACADE_W, IH, IW, SHOP2_IDS, int2Facade, int2Interior, int2Shop } from '../../src/ui/r33/int2px';
import { INT2, int2Exists } from '../../src/sim/r33/int2';

const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
/** Px (0xAABBGGRR) → PNG, ampliado em escala inteira (pixels nítidos). */
function png(p: Px, k = 2): Buffer {
  const w = p.w * k, h = p.h * k, raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; for (let x = 0; x < w; x++) { const c = p.d[Math.floor(y / k) * p.w + Math.floor(x / k)], o = y * (w * 4 + 1) + 1 + x * 4; raw[o] = c & 255; raw[o + 1] = (c >>> 8) & 255; raw[o + 2] = (c >>> 16) & 255; raw[o + 3] = c >>> 24; } }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const out = path.join('docs', 'r33', 'mocks', 'int2');
fs.mkdirSync(out, { recursive: true });
const BG = C('#120c14');
for (const t of INT2) {
  const years = [1889, 1962, 2025, 2035].filter((y) => true);
  const city = t.cities?.[0] ?? 'new_york';
  const ys = years.filter((y) => int2Exists(t, city, y));
  const rowH = Math.max(IH, FACADE_H) + 12, sheet = new Px(FACADE_W + IW + 24, ys.length * rowH + 4);
  sheet.rect(0, 0, sheet.w, sheet.h, BG);
  ys.forEach((y, i) => { const oy = 4 + i * rowH; sheet.blit(int2Facade(t.id, y), 8, oy + 10); sheet.blit(int2Interior(t.id, y), FACADE_W + 16, oy + 10); drawTextOutlined(sheet, `${t.tag} ${y}`, 8, oy + 2, C('#ffd889'), C('#000000')); });
  fs.writeFileSync(path.join(out, `${t.id}.png`), png(sheet));
  console.log(t.id, ys.join(','));
}
const cols3 = 3, rows = Math.ceil(SHOP2_IDS.length / cols3), sh = new Px(cols3 * (IW + 8) + 8, rows * (IH + 14) + 8);
sh.rect(0, 0, sh.w, sh.h, BG);
const YR: Record<string, number> = { sheet: 1905, piano: 1925, telegraph: 1910, gramophone: 1920, tailor: 1950, instruments: 1962, cinema: 1950, radio_tv: 1962, records: 1962, diner: 1962, jukebox_bar: 1962, hifi: 1980, arcade: 1985, video: 1990, cd_mega: 1995, pager: 1998, lan: 2005, phones: 2025, games: 2025, vinyl: 2025, cowork: 2025, holo: 2035, bakery: 1962 };
SHOP2_IDS.forEach((id, i) => { const x = 8 + (i % cols3) * (IW + 8), y = 8 + Math.floor(i / cols3) * (IH + 14); sh.blit(int2Shop(id, YR[id] ?? 1962), x, y + 8); drawTextOutlined(sh, `${id.toUpperCase()} ${YR[id] ?? 1962}`, x, y, C('#ffd889'), C('#000000')); });
fs.writeFileSync(path.join(out, 'lojas.png'), png(sh, 1));
