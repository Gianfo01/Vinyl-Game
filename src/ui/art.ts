// Logos e capas gerados por parâmetros (seed, família, era, orçamento); nada vai para o save (GDD §25).

import { Rng } from '../core/rng';
import { FAMILIES, familyOf } from '../data/world';

const cache = new Map<string, string>();

function eraStyle(year: number): 'deco' | 'classic' | 'psych' | 'punk' | 'neon' | 'grunge' | 'minimal' | 'neural' {
  if (year < 1945) return 'deco';
  if (year < 1964) return 'classic';
  if (year < 1975) return 'psych';
  if (year < 1981) return 'punk';
  if (year < 1990) return 'neon';
  if (year < 2000) return 'grunge';
  if (year < 2030) return 'minimal';
  return 'neural';
}

function hueFor(genre: string): number {
  return FAMILIES.find((f) => f.id === familyOf(genre))?.hue ?? 200;
}

const FONTS = ['Georgia, serif', '"Trebuchet MS", sans-serif', '"Courier New", monospace', 'Impact, sans-serif', '"Palatino Linotype", serif', 'Verdana, sans-serif'];

function canvas(w: number, hgt: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = hgt;
  return [c, c.getContext('2d')!];
}

function initials(name: string): string {
  const words = name.replace(/^(The|Os|As|Los|Las|Dupla)\s+/i, '').split(/[\s&]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function logoUrl(seed: number, name: string, genre: string, year: number, size = 96): string {
  const key = `logo:${seed}:${name}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = Rng.fromSeed(String(seed));
  const [c, ctx] = canvas(size, size);
  const hue = (hueFor(genre) + r.int(-25, 25) + 360) % 360;
  const style = eraStyle(year);
  const bg = `hsl(${hue} ${r.int(35, 70)}% ${r.int(18, 32)}%)`;
  const fg = `hsl(${(hue + 180 + r.int(-30, 30)) % 360} ${r.int(60, 95)}% ${r.int(62, 80)}%)`;
  ctx.fillStyle = bg;
  const shape = r.int(0, 3);
  ctx.beginPath();
  if (shape === 0) ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  else if (shape === 1) ctx.roundRect(2, 2, size - 4, size - 4, size * 0.18);
  else if (shape === 2) {
    ctx.moveTo(size / 2, 2);
    ctx.lineTo(size - 2, size / 2);
    ctx.lineTo(size / 2, size - 2);
    ctx.lineTo(2, size / 2);
  } else {
    ctx.moveTo(size * 0.15, 4);
    ctx.lineTo(size * 0.85, 4);
    ctx.lineTo(size * 0.85, size * 0.6);
    ctx.lineTo(size / 2, size - 4);
    ctx.lineTo(size * 0.15, size * 0.6);
  }
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = fg;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  if (style === 'deco') for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(size / 2, size); ctx.lineTo((i / 7) * size, 0); ctx.stroke(); }
  if (style === 'psych') for (let i = 1; i < 7; i++) { ctx.beginPath(); ctx.arc(size / 2, size / 2, i * size * 0.08 + r.int(0, 3), r.float(0, 3), r.float(3, 6.3)); ctx.stroke(); }
  if (style === 'neon') { ctx.globalAlpha = 0.6; ctx.shadowColor = fg; ctx.shadowBlur = 8; ctx.strokeRect(size * 0.12, size * 0.12, size * 0.76, size * 0.76); }
  if (style === 'punk') for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(r.int(0, size), r.int(0, size)); ctx.lineTo(r.int(0, size), r.int(0, size)); ctx.stroke(); }
  if (style === 'grunge') for (let i = 0; i < 120; i++) { ctx.fillStyle = fg; ctx.fillRect(r.int(0, size), r.int(0, size), 1, 1); }
  if (style === 'neural') for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(r.int(0, size), r.int(0, size), 1.5, 0, 7); ctx.fillStyle = fg; ctx.fill(); }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = fg;
  const font = FONTS[r.int(0, FONTS.length - 1)];
  ctx.font = `bold ${Math.round(size * 0.36)}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials(name), size / 2, size / 2 + 1);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function coverUrl(seed: number, title: string, actName: string, genre: string, year: number, budget = 0.5, size = 160): string {
  const key = `cover:${seed}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = Rng.fromSeed(String(seed));
  const [c, ctx] = canvas(size, size);
  const hue = (hueFor(genre) + r.int(-40, 40) + 360) % 360;
  const style = eraStyle(year);
  const sat = 30 + budget * 50;
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, `hsl(${hue} ${sat}% ${r.int(25, 55)}%)`);
  g.addColorStop(1, `hsl(${(hue + r.int(30, 120)) % 360} ${sat}% ${r.int(10, 40)}%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const accent = `hsl(${(hue + 160) % 360} 80% 70%)`;
  ctx.globalAlpha = 0.55;
  const motif = r.int(0, 4);
  if (motif === 0) for (let i = 0; i < 6; i++) { ctx.fillStyle = `hsla(${(hue + i * 25) % 360} 70% 60% / 0.5)`; ctx.beginPath(); ctx.arc(r.int(0, size), r.int(0, size), r.int(10, 60), 0, 7); ctx.fill(); }
  if (motif === 1) for (let i = 0; i < size; i += r.int(6, 14)) { ctx.fillStyle = accent; ctx.fillRect(0, i, size, r.int(1, 4)); }
  if (motif === 2) { ctx.strokeStyle = accent; ctx.lineWidth = 2; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(size / 2, size / 2, 8 + i * 9, 0, 7); ctx.stroke(); } }
  if (motif === 3) { ctx.fillStyle = accent; for (let x = 0; x < size; x += 16) for (let y = 0; y < size; y += 16) if (r.chance(0.4)) ctx.fillRect(x + 2, y + 2, 12, 12); }
  if (motif === 4) { ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, size * 0.7); for (let x = 0; x <= size; x += 8) ctx.lineTo(x, size * 0.7 - Math.abs(Math.sin(x / 9 + r.next() * 3)) * r.int(10, 50)); ctx.stroke(); }
  if (style === 'grunge' || style === 'punk') { ctx.globalAlpha = 0.25; for (let i = 0; i < 400; i++) { ctx.fillStyle = '#000'; ctx.fillRect(r.int(0, size), r.int(0, size), 2, 2); } }
  if (style === 'deco' || style === 'classic') { ctx.globalAlpha = 0.8; ctx.strokeStyle = '#f3e3b0'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, size - 16, size - 16); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, size - 38, size, 38);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 13px ${FONTS[r.int(0, FONTS.length - 1)]}`;
  ctx.fillText(actName.slice(0, 22), 6, size - 22);
  ctx.font = `11px ${FONTS[1]}`;
  ctx.fillText(title.slice(0, 26), 6, size - 8);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
