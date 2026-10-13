// Folha de arte (dev): ícones, capas de todas as eras e logos lado a lado. Rode `npx vite tools/artsheet` e abra ?part=icons ou ?part=art.
import { ICON_NAMES, icon } from '../../src/ui/pixel/icons';
import { ICON17_NAMES, icon17 } from '../../src/ui/pixel/icons17';
import { coverUrl, logoUrl, badgePx, posterPx } from '../../src/ui/art';
import { upscale } from '../../src/ui/pixel/px';
const root = document.getElementById('root')!;
const sec = (t: string) => { const h = document.createElement('h2'); h.textContent = t; root.append(h); const r = document.createElement('div'); r.className = 'row'; root.append(r); return r; };
const cell = (el: HTMLElement, label: string, cls = '') => { const d = document.createElement('div'); d.className = 'cell ' + cls; const s = document.createElement('span'); s.textContent = label; d.append(el, s); return d; };
const mode = new URLSearchParams(location.search).get('part') ?? 'icons';
if (mode === 'icons') {
  const bar = sec('Barra de ícones (tamanho real 16 px)'); const b = document.createElement('div'); b.className = 'bar';
  for (const n of ['money', 'fame', 'fans', 'disc', 'calendar', 'contract', 'chart-up', 'warning', 'trophy', 'stream', 'mic', 'note'] as const) b.append(icon(n, 1, n));
  for (const n of ['crown', 'compass', 'book', 'people', 'briefcase', 'headphones', 'turntable', 'mixer'] as const) b.append(icon17(n, 1)!);
  bar.append(b);
  const r1 = sec('icons.ts — 2x'); for (const n of ICON_NAMES) r1.append(cell(icon(n, 2), n));
  const r2 = sec('icons17.ts — 2x'); for (const n of ICON17_NAMES) r2.append(cell(icon17(n, 2)!, n));
  const r5 = sec('icons — 4x'); for (const n of ICON_NAMES) r5.append(icon(n, 4)); for (const n of ICON17_NAMES) r5.append(icon17(n, 4)!);
  const r3 = sec('icons.ts — 1x'); for (const n of ICON_NAMES) r3.append(icon(n, 1));
  const r4 = sec('icons17.ts — 1x'); for (const n of ICON17_NAMES) r4.append(icon17(n, 1)!);
} else {
  const img = (src: string, w: number) => { const i = document.createElement('img'); i.src = src; i.width = w; i.height = w; return i; };
  const genres = ['jazz', 'rock', 'samba', 'soul', 'pop', 'techno', 'country', 'reggae'];
  const years = [1932, 1955, 1968, 1977, 1985, 1994, 2005, 2018, 2034];
  for (const y of years) {
    const r = sec(`Capas ${y}`);
    genres.forEach((g, i) => r.append(cell(img(coverUrl(1000 + i * 37 + y, `Album ${i + 1}`, ['Os Mutantes', 'Elis', 'The Kinks', 'Joao Gil', 'Miles Group', 'Nova Onda', 'Rita Lee', 'Daft Duo'][i], g, y, i % 3 === 0 ? 0.3 : 0.7, 160), 96), g, 'cov')));
  }
  const rb = sec('Capas por escolha (1990)'); for (const ch of ['portrait', 'concept', 'provocative', 'minimal', 'illustrated', 'scene', 'diy']) rb.append(cell(img(coverUrl(77, 'Disco', 'Banda X', 'rock', 1990, 0.7, 160, ch), 96), ch, 'cov'));
  const labels = ['Odeon', 'Philips', 'Elenco', 'Som Livre', 'Trama', 'Deck', 'Biscoito Fino', 'Rocinante', 'Neural Rec'];
  for (const sz of [40, 18]) {
    const r = sec(`Logos de gravadoras/atos (${sz} px)`);
    years.forEach((y, i) => labels.forEach((n, j) => { if (j < 4) r.append(cell(img(logoUrl(500 + i * 11 + j * 3, n, genres[j], y, 96), sz), `${y}`, 'lg')); }));
  }
  const rp = sec('Crachás e cartazes (sede, 4x)');
  years.forEach((y, i) => { rp.append(upscale(badgePx(300 + i, labels[i], genres[i % 8], y).canvas(), 4 * 14, 4 * 11)); rp.append(upscale(posterPx(300 + i, labels[i], genres[i % 8], y).canvas(), 56, 76)); });
}
