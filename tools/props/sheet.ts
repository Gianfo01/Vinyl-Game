// Prancha de contato (contact sheet) para revisar props: miniaturas em grade sobre fundo neutro.

import { drawText, textWidth } from '../../src/ui/pixel/font';
import { C, Px, type Col } from '../../src/ui/pixel/px';

export function contactSheet(items: { label: string; img: Px }[], o: { cols?: number; cell?: number; bg?: Col; ink?: Col; scale?: number } = {}): Px {
  const cols = o.cols ?? 6;
  const cell = o.cell ?? 260;
  const lab = 12;
  const rows = Math.ceil(items.length / cols);
  const out = new Px(cols * cell, rows * (cell + lab));
  const bg = o.bg ?? C('#b9b6ae');
  out.d.fill(bg);
  items.forEach((it, i) => {
    const cx = (i % cols) * cell;
    const cy = Math.floor(i / cols) * (cell + lab);
    const fit = Math.min((cell - 8) / it.img.w, (cell - 8) / it.img.h);
    // escala inteira quando possível (pixel art nítida); senão amostragem por vizinho
    const s = o.scale ?? (fit >= 1 ? Math.floor(fit) : fit);
    const w = Math.round(it.img.w * s);
    const h = Math.round(it.img.h * s);
    const ox = cx + Math.floor((cell - w) / 2);
    const oy = cy + Math.floor((cell - h) / 2);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = it.img.d[Math.min(it.img.h - 1, Math.floor(y / s)) * it.img.w + Math.min(it.img.w - 1, Math.floor(x / s))];
        if (c >>> 24) out.set(ox + x, oy + y, c);
      }
    const t = it.label.slice(0, 40);
    drawText(out, t, cx + Math.max(2, Math.floor((cell - textWidth(t)) / 2)), cy + cell + 2, o.ink ?? C('#1a1a24'));
  });
  return out;
}
