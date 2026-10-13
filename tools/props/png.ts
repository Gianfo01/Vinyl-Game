// PNG mínimo para as ferramentas de assets (Node, sem dependências): decodifica PNG 8 bits
// (cinza, RGB, RGBA, paleta; sem entrelaçamento) e codifica RGBA. Os pixels usam o mesmo
// empacotamento do jogo (Col = 0xAABBGGRR, ver src/ui/pixel/px.ts).

import { deflateSync, inflateSync } from 'node:zlib';

export interface Img {
  w: number;
  h: number;
  d: Uint32Array;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function encodePNG(img: Img): Buffer {
  const { w, h, d } = img;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  const src = new Uint8Array(d.buffer, d.byteOffset, w * h * 4);
  for (let y = 0; y < h; y++) {
    const o = y * (w * 4 + 1);
    raw[o] = 0; // filtro "nenhum": a pixel art comprime bem assim
    Buffer.from(src.subarray(y * w * 4, (y + 1) * w * 4)).copy(raw, o + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decodifica PNG de 8 bits. Arquivos truncados devolvem as linhas que existirem (o resto fica transparente). */
export function decodePNG(buf: Buffer): Img {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('não é PNG');
  let off = 8;
  let w = 0;
  let h = 0;
  let type = 0;
  let depth = 0;
  let pal: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Buffer[] = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, Math.min(buf.length, off + 8 + len));
    if (t === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8];
      type = data[9];
      if (data[12] !== 0) throw new Error('PNG entrelaçado não suportado');
    } else if (t === 'PLTE') pal = new Uint8Array(data);
    else if (t === 'tRNS') trns = new Uint8Array(data);
    else if (t === 'IDAT') idat.push(Buffer.from(data));
    else if (t === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8) throw new Error(`profundidade ${depth} não suportada`);
  const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type as 0 | 2 | 3 | 4 | 6];
  if (!bpp) throw new Error(`tipo de cor ${type} não suportado`);
  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat));
  } catch {
    // arquivo truncado: descomprime o que der
    raw = inflateSync(Buffer.concat(idat), { finishFlush: 2 /* Z_SYNC_FLUSH */ });
  }
  const stride = w * bpp;
  const rows = Math.min(h, Math.floor(raw.length / (stride + 1)));
  const px = new Uint8Array(stride * h);
  for (let y = 0; y < rows; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const o = y * stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? px[o + i - bpp] : 0;
      const b = y > 0 ? px[o - stride + i] : 0;
      const c = i >= bpp && y > 0 ? px[o - stride + i - bpp] : 0;
      const x = line[i];
      px[o + i] = (f === 0 ? x : f === 1 ? x + a : f === 2 ? x + b : f === 3 ? x + ((a + b) >> 1) : x + paeth(a, b, c)) & 255;
    }
  }
  const d = new Uint32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (Math.floor(i / w) >= rows) break;
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 255;
    const p = i * bpp;
    if (type === 6) [r, g, b, a] = [px[p], px[p + 1], px[p + 2], px[p + 3]];
    else if (type === 2) [r, g, b] = [px[p], px[p + 1], px[p + 2]];
    else if (type === 0) r = g = b = px[p];
    else if (type === 4) [r, g, b, a] = [px[p], px[p], px[p], px[p + 1]];
    else if (pal) {
      const k = px[p];
      [r, g, b] = [pal[k * 3], pal[k * 3 + 1], pal[k * 3 + 2]];
      a = trns && k < trns.length ? trns[k] : 255;
    }
    d[i] = (((a & 255) << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  return { w, h, d };
}
