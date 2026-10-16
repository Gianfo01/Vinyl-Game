// R31 · onda 4 (ART2) — ADEREÇOS NOVOS dos interiores, no pixel art antigo do jogo (mesmo corte lateral de interior27:
// luz de cima à esquerda, pé em sombra arroxeada, contorno escuro quente aplicado pela camada de adereços, rampa de 6 tons
// via lv/tint). Arquivo separado dos adereços existentes (interior27/hqpx27) para não brigar com quem uniformiza o estilo.
//   variant31(t, ano)        — PURO: qual desenho da época (jukebox de corneta → Wurlitzer → CD → tela → holograma…);
//   box31(t, x, w, G, ano)   — PURO: a caixa do desenho em pixels lógicos (a área clicável usa a mesma conta);
//   drawProps31(g, itens, G) — pinta na camada de adereços do interior (chamado pelo gancho `extra` do drawInterior27).
// Tudo determinístico: mesma entrada, mesmos pixels. Nada vai para o save.

import { C, INK, lv, mix, withAlpha, type Col } from './px';
import { drawText, fitText, textWidth } from './font';
import { prim27, type Ctx27 } from '../ps/hqpx27';

export type ArtT31 = 'jukebox' | 'charts' | 'phone' | 'relic' | 'ratings' | 'rack' | 'flyers' | 'arcade' | 'car' | 'wanted' | 'pa' | 'radio';
export const ART_TYPES31: ArtT31[] = ['jukebox', 'charts', 'phone', 'relic', 'ratings', 'rack', 'flyers', 'arcade', 'car', 'wanted', 'pa', 'radio'];
/** Variação do carro (quem está na porta). */
export type CarK31 = 'tour' | 'boss' | 'police' | 'van' | 'cab' | 'own';
export interface ArtItem31 {
  t: ArtT31; x: number; w?: number;
  /** carro: quem é; vitrine: o que tem dentro; parada: quantas linhas acesas */
  car?: CarK31; n?: number; lit?: boolean;
  /** texto curto pintado (manchete do cartaz, número 1 da parada) — opcional */
  label?: string;
}
export interface G31 { W: number; H: number; x0: number; w0: number; y0: number; fy: number; X: (f: number) => number; Wd: (f?: number) => number }

// ---------------------------------------------------------------- épocas (puro)

const V: Record<ArtT31, [number, string][]> = {
  jukebox: [[1925, 'horn'], [1946, 'wood'], [1961, 'arch'], [1980, 'chrome'], [2005, 'cd'], [2030, 'touch'], [9999, 'holo']],
  charts: [[1940, 'sheet'], [1970, 'hitparade'], [2000, 'top40'], [2015, 'lcd'], [9999, 'stream']],
  phone: [[1930, 'crank'], [1970, 'booth'], [2000, 'hood'], [2020, 'pay'], [9999, 'totem']],
  relic: [[1960, 'wood'], [2000, 'glass'], [9999, 'led']],
  ratings: [[1960, 'chalk'], [1996, 'magnet'], [9999, 'screen']],
  rack: [[1950, 'chamber'], [1966, 'tape'], [1982, 'valve'], [2000, 'digital'], [2025, 'laptop'], [9999, 'neural']],
  flyers: [[1960, 'print'], [2005, 'xerox'], [9999, 'qr']],
  arcade: [[1947, 'mutoscope'], [1978, 'pinball'], [2006, 'cabinet'], [9999, 'dance']],
  car: [[1931, 't'], [1950, 'sedan'], [1968, 'fins'], [1990, 'boxy'], [2015, 'modern'], [9999, 'pod']],
  wanted: [[1950, 'sepia'], [1990, 'photo'], [9999, 'print']],
  pa: [[1930, 'horn'], [1956, 'column'], [1976, 'stack'], [1996, 'tower'], [2026, 'array'], [9999, 'holo']],
  radio: [[1925, 'gramo'], [1955, 'cathedral'], [1976, 'console'], [1996, 'boombox'], [2016, 'micro'], [9999, 'smart']],
};
/** O desenho da época: o primeiro corte cujo ano-limite ainda não chegou. */
export function variant31(t: ArtT31, year: number): string {
  for (const [y, v] of V[t]) if (year < y) return v;
  return V[t][V[t].length - 1][1];
}
/** Todas as variações de um tipo (testes e documento). */
export const variants31 = (t: ArtT31): string[] => V[t].map((x) => x[1]);

/** Caixa do desenho (pixels lógicos). A área clicável e a pintura usam a mesma conta. */
export function box31(it: Pick<ArtItem31, 't' | 'x' | 'w' | 'car'>, G: G31, year: number): { x: number; y: number; w: number; h: number } {
  const x = G.X(it.x), v = variant31(it.t, year);
  const gy = G.H - 16; // rua (STREET do interior27)
  switch (it.t) {
    case 'jukebox': return v === 'touch' ? { x, y: G.y0 + 20, w: 16, h: 22 } : { x, y: G.fy - (v === 'horn' ? 28 : 25), w: v === 'holo' ? 12 : 15, h: v === 'horn' ? 28 : 25 };
    case 'charts': { const w = Math.max(26, G.Wd(it.w ?? 0.08)); return { x, y: G.y0 + 10, w, h: 30 }; }
    case 'phone': return v === 'crank' ? { x, y: G.y0 + 26, w: 9, h: 16 } : v === 'booth' ? { x, y: G.fy - 44, w: 18, h: 44 } : v === 'totem' ? { x, y: G.fy - 26, w: 9, h: 26 } : { x, y: G.fy - 30, w: 14, h: 30 };
    case 'relic': return { x, y: G.y0 + 12, w: Math.max(26, G.Wd(it.w ?? 0.1)), h: 24 };
    case 'ratings': return { x, y: G.y0 + 10, w: Math.max(30, G.Wd(it.w ?? 0.12)), h: 26 };
    case 'rack': return { x, y: G.y0 + 10, w: Math.max(26, G.Wd(it.w ?? 0.1)), h: 26 };
    case 'flyers': return { x, y: G.y0 + 10, w: Math.max(26, G.Wd(it.w ?? 0.1)), h: 24 };
    case 'arcade': return { x, y: G.fy - 30, w: v === 'pinball' ? 20 : 15, h: 30 };
    case 'car': { const w = it.car === 'tour' && (v === 'boxy' || v === 'modern' || v === 'pod') ? 58 : 44; return { x, y: gy + 1, w, h: 14 }; }
    case 'wanted': return { x, y: G.y0 + 14, w: 16, h: 22 };
    case 'pa': return { x, y: G.fy - 9 - (v === 'array' ? 54 : v === 'horn' ? 36 : 34), w: v === 'horn' ? 14 : 12, h: v === 'array' ? 54 : v === 'horn' ? 36 : 34 };
    case 'radio': return { x, y: G.fy - 22, w: v === 'boombox' ? 20 : 16, h: 22 };
  }
}

// ---------------------------------------------------------------- pintura

const blk = prim27.blk;
const hs = (s: string): number => { let x = 2166136261; for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619) >>> 0; return x; };
const GLOW = (c: Col, a = 60): Col => withAlpha(c, a);
const BULB = [C('#ff6040'), C('#60c0ff'), C('#f0e060'), C('#80ff80'), C('#ff80d0')];

/** Linhas de texto miúdo (fonte 3×5) cortadas para caber. */
function tiny(g: Ctx27, s: string, x: number, y: number, maxW: number, c: Col): void {
  const t = fitText(s.toUpperCase(), maxW);
  drawText(g.p, t, x, y, c);
}

export function drawProps31(g: Ctx27, items: ArtItem31[], G: G31, seed = 0): void {
  const year = g.pl.year;
  for (const it of items) {
    const b = box31(it, G, year), v = variant31(it.t, year);
    const sd = (seed ^ hs(`${it.t}|${it.x}`)) >>> 0;
    switch (it.t) {
      case 'jukebox': jukebox(g, b, v, sd); break;
      case 'charts': charts(g, b, v, it); break;
      case 'phone': phone(g, b, v); break;
      case 'relic': relic(g, b, v, it.n ?? 1, sd); break;
      case 'ratings': ratings(g, b, v, sd); break;
      case 'rack': rack(g, b, v, sd); break;
      case 'flyers': flyers(g, b, v, sd); break;
      case 'arcade': arcade(g, b, v, sd); break;
      case 'car': car(g, b, v, it.car ?? 'cab', sd); break;
      case 'wanted': wanted(g, b, v, sd); break;
      case 'pa': pa(g, b, v); break;
      case 'radio': radio(g, b, v, sd); break;
    }
  }
}

type B = { x: number; y: number; w: number; h: number };

/** Jukebox: corneta de gramofone a ficha → móvel de madeira → arco de bolhas → caixa cromada → CD → tela na parede → holograma. */
function jukebox(g: Ctx27, b: B, v: string, sd: number): void {
  const { p, pal } = g; const { x, y, w, h } = b;
  if (v === 'horn') { // fonógrafo a ficha: gabinete de madeira com corneta de latão
    blk(p, x + 1, y + 12, w - 2, h - 12, pal.wood);
    p.rect(x + 3, y + 15, w - 6, 4, lv(pal.wood, 1.4)); p.rect(x + 4, y + 16, 3, 1, C('#d8b040')); // fenda da ficha
    p.poly([[x + 6, y + 12], [x + 2, y + 1], [x + w - 1, y]], C('#c89a3a'));
    p.line(x + 6, y + 12, x + 3, y + 2, lv(C('#c89a3a'), 4.6));
    p.ellipse(x + w - 4, y + 3, 4, 3, lv(C('#c89a3a'), 1.6));
    p.rect(x + 3, y + h - 3, w - 6, 1, lv(pal.wood, 1));
    return;
  }
  if (v === 'wood') { // móvel de madeira com grade e janelinha
    blk(p, x, y + 3, w, h - 3, pal.wood);
    p.ellipse(x + (w >> 1), y + 4, (w >> 1), 3, lv(pal.wood, 3.6));
    blk(p, x + 3, y + 7, w - 6, 5, C('#f0d890')); for (let i = 0; i < 3; i++) p.put(x + 4 + i * 3, y + 9, C('#6a4a2a'));
    for (let yy = y + 14; yy < y + h - 3; yy += 2) p.hline(x + 3, x + w - 4, yy, lv(pal.wood, 1.2));
    return;
  }
  if (v === 'arch') { // Wurlitzer: arco de tubos de luz coloridos
    blk(p, x, y + 6, w, h - 6, C('#8a2a2a'));
    p.ellipse(x + (w >> 1), y + 7, (w >> 1), 7, C('#8a2a2a'));
    for (let i = 0; i < 3; i++) p.ellipse(x + (w >> 1), y + 8, (w >> 1) - 1 - i, 7 - i, i === 1 ? C('#f0c050') : i === 2 ? C('#ff7a40') : C('#e8e0d0'));
    p.ellipse(x + (w >> 1), y + 9, 3, 3, C('#3a2a2a'));
    p.rect(x + 2, y + 13, w - 4, 5, C('#3a2a2a')); for (let i = 0; i < 4; i++) p.rect(x + 3 + i * 3, y + 14, 2, 3, BULB[(i + sd) % 5]);
    for (let yy = y + 20; yy < y + h - 2; yy += 2) p.hline(x + 3, x + w - 4, yy, C('#c8a040'));
    p.rect(x - 1, y + 4, w + 2, 2, GLOW(C('#ffb060'), 50));
    return;
  }
  if (v === 'chrome') { // caixa cromada com painel de seleção
    blk(p, x, y, w, h, C('#b8bcc8'));
    blk(p, x + 2, y + 2, w - 4, 7, C('#2a3a5a')); for (let i = 0; i < 3; i++) p.rect(x + 3 + i * 3, y + 3, 2, 5, C('#e8e0c8'));
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) p.put(x + 3 + i * 3, y + 11 + r * 2, BULB[(r + i + sd) % 5]);
    blk(p, x + 2, y + 18, w - 4, h - 20, C('#5a5e68')); for (let yy = y + 19; yy < y + h - 2; yy += 2) p.hline(x + 3, x + w - 4, yy, C('#3a3e48'));
    return;
  }
  if (v === 'cd') { // jukebox de CD: preto, janela iluminada com o carrossel
    blk(p, x, y, w, h, C('#1e1e26'));
    p.rect(x + 2, y + 2, w - 4, 9, C('#3a4a8a')); p.disc(x + (w >> 1), y + 6, 3, C('#c8d0e0')); p.put(x + (w >> 1), y + 6, INK);
    p.rect(x + 2, y + 13, w - 4, 3, C('#7af0ff'));
    for (let i = 0; i < 4; i++) p.put(x + 3 + i * 3, y + 18, BULB[(i + sd) % 5]);
    p.rect(x - 1, y + h - 1, w + 2, 1, GLOW(C('#7af0ff'), 50));
    return;
  }
  if (v === 'touch') { // tela de parede com a capa tocando
    blk(p, x, y, w, h, C('#16161c'));
    p.rect(x + 2, y + 2, w - 4, h - 7, mix(pal.accent, C('#202840'), 0.5));
    p.rect(x + 4, y + 4, 6, 6, pal.accent2); p.rect(x + 11, y + 5, w - 15, 1, C('#e8e8f0')); p.rect(x + 11, y + 8, w - 17, 1, C('#9aa0b0'));
    for (let i = 0; i < 4; i++) p.rect(x + 3 + i * 3, y + h - 8, 2, 1 + ((sd >> i) & 3), C('#7af0ff'));
    p.rect(x + 2, y + h - 4, w - 4, 2, C('#2a2a34'));
    return;
  }
  // holograma: coluna baixa com o disco flutuando
  blk(p, x, y + h - 8, w, 8, C('#2a2e3a'));
  p.ellipse(x + (w >> 1), y + 8, 5, 5, withAlpha(C('#7af0ff'), 120));
  p.ellipse(x + (w >> 1), y + 8, 2, 2, withAlpha(C('#ffffff'), 160));
  p.poly([[x + 2, y + h - 8], [x + (w >> 1), y + 4], [x + w - 2, y + h - 8]], withAlpha(C('#7af0ff'), 36));
}

/** Parada da semana: folha de partituras mais vendidas → "Hit Parade" impresso → quadro de números encaixados → LCD → tela com barras. */
function charts(g: Ctx27, b: B, v: string, it: ArtItem31): void {
  const { p, pal } = g; const { x, y, w, h } = b;
  const n = Math.max(3, Math.min(5, it.n ?? 5));
  if (v === 'sheet' || v === 'hitparade') {
    blk(p, x, y, w, h, v === 'sheet' ? C('#efe2c2') : C('#f4ecd8'));
    p.rect(x + 1, y + 1, w - 2, 6, v === 'sheet' ? C('#5a3a24') : C('#b8322a'));
    tiny(g, v === 'sheet' ? 'MAIS' : 'HIT', x + 3, y + 2, w - 5, C('#f8f0dc'));
    for (let i = 0; i < n; i++) { const yy = y + 9 + i * 4; p.rect(x + 2, yy, 2, 2, C('#1a1a22')); p.rect(x + 6, yy, w - 9 - ((i * 5) % 7), 1, i === 0 && it.lit ? C('#b8322a') : C('#6a6058')); }
    return;
  }
  if (v === 'top40') { // quadro preto com números encaixados (como os das rádios)
    blk(p, x, y, w, h, C('#1e1a22'));
    p.rect(x + 1, y + 1, w - 2, 6, C('#e8c050')); tiny(g, 'TOP40', x + 3, y + 2, w - 4, C('#1e1a22'));
    for (let i = 0; i < n; i++) { const yy = y + 9 + i * 4; p.rect(x + 2, yy, 3, 3, C('#f8f0dc')); p.rect(x + 7, yy + 1, w - 10 - ((i * 3) % 6), 1, i === 0 && it.lit ? C('#ff9a4a') : C('#c8c0b0')); }
    return;
  }
  // tela (LCD azulado ou streaming com barras)
  blk(p, x, y, w, h, C('#16161c'));
  const scr = v === 'lcd' ? C('#2a4a7a') : C('#1a2030');
  p.rect(x + 2, y + 2, w - 4, h - 4, scr);
  p.rect(x + 3, y + 3, w - 6, 3, v === 'lcd' ? C('#9ad0f0') : pal.accent);
  for (let i = 0; i < n; i++) {
    const yy = y + 8 + i * 4, len = Math.max(3, Math.round((w - 10) * (1 - i * 0.16)));
    p.rect(x + 3, yy, 2, 2, C('#e8e8f0'));
    p.rect(x + 7, yy, len, 2, i === 0 && it.lit ? C('#ffd060') : v === 'lcd' ? C('#7ac0e8') : mix(pal.accent2, C('#ffffff'), 0.2));
  }
  p.rect(x + 1, y + h, w - 2, 1, GLOW(v === 'lcd' ? C('#9ad0f0') : pal.accent, 40));
}

/** Telefone público: de manivela na parede → cabine de madeira e vidro → orelhão (capuz) → público de metal → totem de carga. */
function phone(g: Ctx27, b: B, v: string): void {
  const { p, pal } = g; const { x, y, w, h } = b;
  if (v === 'crank') {
    blk(p, x, y, w, h, pal.wood);
    p.disc(x + 2, y + 3, 1.5, C('#e8e0c8')); p.disc(x + w - 3, y + 3, 1.5, C('#e8e0c8')); // campainhas
    p.rect(x + 3, y + 7, 3, 5, C('#1a1a22')); // bocal
    p.rect(x + w, y + 6, 2, 1, C('#4a4440')); p.rect(x + w + 1, y + 7, 1, 4, C('#4a4440')); // manivela
    p.rect(x - 2, y + 5, 2, 5, C('#1a1a22')); // fone no gancho
    return;
  }
  if (v === 'booth') { // cabine de madeira com porta de vidro e luz no topo
    blk(p, x, y, w, h, pal.woodDark);
    blk(p, x + 1, y, w - 2, 5, lv(pal.woodDark, 2)); tiny(g, 'TEL', x + 4, y, w - 6, C('#f0d890'));
    p.rect(x + 3, y + 7, w - 6, h - 12, withAlpha(C('#a8d8f0'), 110));
    p.rect(x + (w >> 1) - 1, y + 12, 3, 5, C('#1a1a22')); p.vline(x + (w >> 1), y + 17, y + 22, C('#3a3a40'));
    p.vline(x + 4, y + 8, y + h - 6, withAlpha(C('#ffffff'), 90));
    return;
  }
  if (v === 'hood') { // orelhão: capuz arredondado num poste
    p.rect(x + (w >> 1) - 1, y + 14, 2, h - 14, C('#6a6e78'));
    p.ellipse(x + (w >> 1), y + 8, (w >> 1), 8, C('#e8a030'));
    p.ellipse(x + (w >> 1), y + 10, (w >> 1) - 2, 6, lv(C('#e8a030'), 1.2));
    blk(p, x + (w >> 1) - 3, y + 7, 6, 7, C('#3a3a40')); p.rect(x + (w >> 1) - 2, y + 8, 4, 2, C('#9aa0a8'));
    p.rect(x + (w >> 1) - 5, y + 9, 2, 4, C('#1a1a22'));
    return;
  }
  if (v === 'pay') { // telefone de metal com teclado num poste
    p.rect(x + (w >> 1) - 1, y + 14, 2, h - 14, C('#6a6e78'));
    blk(p, x + 1, y + 1, w - 2, 15, C('#7a8090'));
    blk(p, x + 3, y + 3, w - 6, 4, C('#2a3a2a')); p.rect(x + 4, y + 4, w - 8, 1, C('#7ad070'));
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) p.put(x + 4 + i * 2, y + 9 + r * 2, C('#e8e8f0'));
    p.rect(x - 1, y + 4, 2, 7, C('#1a1a22'));
    return;
  }
  // totem de carga de celular
  blk(p, x, y, w, h, C('#e8e6dc'));
  p.rect(x + 2, y + 2, w - 4, 8, C('#2a3040')); p.rect(x + 3, y + 3, w - 6, 2, C('#7af0ff'));
  for (let i = 0; i < 3; i++) p.rect(x + 2, y + 13 + i * 3, w - 4, 1, C('#5a5e68'));
}

/** Vitrine de relíquias: caixa de madeira com vidro → vitrine de vidro com luz → caixa de LED; a peça muda pelo semente. */
function relic(g: Ctx27, b: B, v: string, n: number, sd: number): void {
  const { p, pal } = g; const { x, y, w, h } = b;
  blk(p, x, y, w, h, v === 'wood' ? pal.woodDark : v === 'glass' ? C('#5a5e68') : C('#2a2e3a'));
  p.rect(x + 2, y + 2, w - 4, h - 5, v === 'led' ? C('#1a1e2a') : C('#3a2e2a'));
  const k = Math.max(0, Math.min(3, n));
  if (!k) { // R31 (POL): vitrine sem peça — suporte vazio no veludo e plaquinha "em breve" (nunca um retângulo liso)
    const cx = x + (w >> 1), base = y + h - 4;
    p.rect(x + 2, base - 2, w - 4, 2, C('#7a1c2a')); p.hline(x + 2, x + w - 3, base - 2, lv(C('#7a1c2a'), 4)); // veludo
    p.vline(cx - 3, base - 12, base - 3, C('#c8b070')); p.vline(cx + 3, base - 12, base - 3, C('#c8b070')); p.hline(cx - 4, cx + 4, base - 3, C('#c8b070')); // suporte em U vazio
    p.put(cx - 3, base - 13, lv(C('#c8b070'), 4.6)); p.put(cx + 3, base - 13, lv(C('#c8b070'), 4.6));
    p.rect(cx - 5, base - 1, 10, 3, C('#f0e8d0')); p.hline(cx - 3, cx + 2, base, C('#6a5a4a')); // plaquinha
  }
  for (let i = 0; i < k; i++) {
    const cx = x + Math.round(((w - 4) * (i + 0.5)) / k) + 2, base = y + h - 4;
    const kind = (sd >> (i * 3)) % 4;
    if (kind === 0) { p.disc(cx, base - 8, 5, C('#e8c45a')); p.disc(cx, base - 8, 2, lv(C('#e8c45a'), 1.4)); p.put(cx - 2, base - 10, C('#fff4c8')); } // disco de ouro
    else if (kind === 1) { p.ellipse(cx, base - 5, 4, 4, C('#d8402c')); p.disc(cx, base - 5, 1, INK); p.rect(cx - 1, base - 17, 2, 9, C('#c89a5a')); p.rect(cx - 2, base - 18, 4, 2, C('#4a3020')); } // guitarra de pé
    else if (kind === 2) { p.ellipse(cx, base - 13, 2, 3, C('#c8ccd4')); p.vline(cx, base - 10, base - 2, C('#9aa0a8')); p.rect(cx - 2, base - 2, 5, 1, C('#9aa0a8')); } // microfone antigo
    else { p.rect(cx - 3, base - 11, 7, 10, C('#f0e8d0')); p.rect(cx - 2, base - 9, 5, 1, C('#4a4440')); p.rect(cx - 2, base - 7, 4, 1, C('#4a4440')); p.rect(cx - 2, base - 5, 5, 1, C('#4a4440')); } // manuscrito
  }
  p.rect(x + 2, y + 2, w - 4, h - 5, withAlpha(C('#c8e8f8'), v === 'wood' ? 40 : 60)); // vidro
  p.line(x + 4, y + 3, x + 8, y + h - 5, withAlpha(C('#ffffff'), 110));
  if (v !== 'wood') p.rect(x + 2, y + 2, w - 4, 1, v === 'led' ? C('#7af0ff') : C('#ffe0a0'));
}

/** Quadro de audiência das rádios: lousa → quadro magnético com barras → tela. */
function ratings(g: Ctx27, b: B, v: string, sd: number): void {
  const { p, pal } = g; const { x, y, w, h } = b;
  const face = v === 'chalk' ? C('#2a3a30') : v === 'magnet' ? C('#e8e6dc') : C('#1a2030');
  blk(p, x, y, w, h, v === 'chalk' ? pal.wood : C('#3a3e48'));
  p.rect(x + 2, y + 2, w - 4, h - 4, face);
  const ink = v === 'chalk' ? C('#e8e8e0') : v === 'magnet' ? C('#2a2a30') : C('#9ad0f0');
  for (let i = 0; i < 4; i++) {
    const yy = y + 4 + i * 5, len = 4 + ((sd >> (i * 4)) % Math.max(4, w - 16));
    p.rect(x + 4, yy, 4, 2, ink);
    p.rect(x + 10, yy, len, 3, v === 'chalk' ? C('#c8c0b0') : [pal.accent, C('#3a8a4a'), C('#e8a030'), pal.accent2][i]);
  }
  if (v === 'chalk') p.rect(x + 2, y + h - 2, w - 4, 1, C('#d8d0c0')); // giz no canto
}

/** Rack de efeitos do estúdio: câmara de eco → eco de fita → compressores valvulados → rack digital → laptop → processador neural. */
function rack(g: Ctx27, b: B, v: string, sd: number): void {
  const { p, pal } = g; const { x, y, w, h } = b;
  if (v === 'chamber') { // janelinha para a câmara de eco + microfone de fita no pedestal
    blk(p, x, y, w, h, C('#c8bca0'));
    p.rect(x + 3, y + 3, w - 6, 10, C('#3a3430')); p.rect(x + 4, y + 4, w - 8, 3, withAlpha(C('#a8d8f0'), 90));
    tiny(g, 'ECO', x + 4, y + 15, w - 6, C('#3a2a24'));
    return;
  }
  blk(p, x, y, w, h, C('#2a2a30'));
  const rows = v === 'laptop' || v === 'neural' ? 1 : 4;
  if (rows === 4) for (let r = 0; r < 4; r++) {
    const yy = y + 2 + r * 6;
    const face = v === 'tape' ? (r % 2 ? C('#c8bca0') : C('#8a7a5a')) : v === 'valve' ? (r % 2 ? C('#3a3a40') : C('#9aa0a8')) : C('#3a3e48');
    blk(p, x + 2, yy, w - 4, 5, face);
    for (let i = 0; i < 3; i++) p.put(x + 4 + i * 4, yy + 2, v === 'valve' && r % 2 === 0 ? C('#1a1a22') : C('#e8e0c8'));
    if (v === 'valve' && r === 1) for (let i = 0; i < 3; i++) p.rect(x + w - 10 + i * 3, yy + 1, 2, 3, C('#ff9a40')); // válvulas acesas
    if (v === 'tape' && r === 0) { p.disc(x + 6, yy + 2, 2, C('#4a4440')); p.disc(x + w - 7, yy + 2, 2, C('#4a4440')); }
    if (v === 'digital') p.rect(x + w - 12, yy + 1, 8, 2, r === (sd % 4) ? C('#ff6040') : C('#7af0ff'));
  }
  else if (v === 'laptop') { blk(p, x + 3, y + h - 8, w - 6, 3, C('#9aa0a8')); p.rect(x + 5, y + 6, w - 10, h - 15, C('#1a2030')); p.rect(x + 6, y + 8, w - 12, 2, C('#7ad070')); for (let i = 0; i < 4; i++) p.rect(x + 6 + i * 3, y + 12, 2, 2 + ((sd >> i) & 3), C('#e8a030')); }
  else { p.disc(x + (w >> 1), y + (h >> 1), 6, C('#3a2a5a')); p.disc(x + (w >> 1), y + (h >> 1), 3, withAlpha(C('#c080ff'), 200)); p.rect(x + 2, y + h - 4, w - 4, 1, pal.accent); }
}

/** Mural de recados de músicos: papéis impressos → xerox → papéis com código QR. */
function flyers(g: Ctx27, b: B, v: string, sd: number): void {
  const { p } = g; const { x, y, w, h } = b;
  blk(p, x, y, w, h, C('#b08a5a')); // cortiça
  const n = Math.max(3, Math.floor(w / 9));
  for (let i = 0; i < n; i++) {
    const fx = x + 2 + i * Math.floor((w - 4) / n) + ((sd >> i) & 1), fy = y + 2 + ((sd >> (i + 2)) & 3) * 2, fw = 7, fh = 10 + ((sd >> (i + 4)) & 3);
    const paper = v === 'print' ? C('#efe2c2') : v === 'xerox' ? C('#e8e8e8') : [C('#f0f0f0'), C('#ffe070'), C('#80d0ff')][i % 3];
    p.rect(fx, fy, fw, Math.min(fh, h - 4 - (fy - y)), paper);
    p.put(fx + 3, fy, C('#c8302c')); // tachinha
    if (v === 'qr') { p.rect(fx + 1, fy + 2, 4, 4, C('#1a1a22')); p.put(fx + 2, fy + 3, paper); }
    else for (let r = 0; r < 3; r++) p.rect(fx + 1, fy + 3 + r * 2, 5 - (r % 2), 1, C('#4a4440'));
    p.rect(fx + 1, fy + fh - 3, 1, 2, C('#4a4440')); p.rect(fx + 3, fy + fh - 3, 1, 2, C('#4a4440')); // tirinhas de telefone
  }
}

/** Máquina do saguão: mutoscópio → fliperama de pinball → fliperama de gabinete → máquina de dança. */
function arcade(g: Ctx27, b: B, v: string, sd: number): void {
  const { p, pal } = g; const { x, y, w, h } = b;
  if (v === 'mutoscope') {
    p.rect(x + 5, y + 14, 4, h - 14, C('#4a4440'));
    blk(p, x + 1, y + 4, w - 2, 12, C('#8a2a2a'));
    p.rect(x + 4, y + 2, w - 8, 3, C('#1a1a22')); // visor
    p.disc(x + w - 2, y + 10, 2, C('#c89a3a')); // manivela
    tiny(g, 'VER', x + 2, y + 8, w - 4, C('#f0d890'));
    return;
  }
  if (v === 'pinball') {
    p.rect(x + 1, y + h - 6, 1, 6, C('#3a3a40')); p.rect(x + w - 2, y + h - 6, 1, 6, C('#3a3a40'));
    blk(p, x, y + h - 14, w, 8, C('#2a3a6a'));
    p.rect(x + 2, y + h - 13, w - 4, 5, C('#3a8a4a')); p.put(x + 6, y + h - 11, C('#e8e8f0')); p.put(x + 12, y + h - 10, BULB[sd % 5]);
    blk(p, x + w - 8, y, 8, h - 13, C('#1a1a22')); // painel traseiro
    p.rect(x + w - 7, y + 2, 6, 8, BULB[(sd + 2) % 5]); p.rect(x + w - 7, y + 12, 6, 2, C('#ff6040'));
    return;
  }
  if (v === 'cabinet') {
    blk(p, x, y, w, h, C('#2a2a50'));
    p.rect(x + 1, y + 1, w - 2, 4, pal.accent); tiny(g, 'HI', x + 3, y, w - 4, C('#1a1a22'));
    p.rect(x + 2, y + 7, w - 4, 9, C('#0a0a14')); for (let i = 0; i < 3; i++) p.put(x + 4 + i * 3, y + 9 + i * 2, BULB[(i + sd) % 5]);
    blk(p, x - 1, y + 17, w + 2, 4, C('#3a3a50')); p.put(x + 3, y + 18, C('#e83030')); p.put(x + 8, y + 18, C('#30a0e8'));
    p.rect(x + 1, y + 7, w - 2, 1, GLOW(C('#7af0ff'), 70));
    return;
  }
  // máquina de dança: tela grande e o tablado de setas
  blk(p, x, y, w, h - 6, C('#1e1e26'));
  p.rect(x + 2, y + 2, w - 4, 10, C('#3a2a6a')); p.rect(x + 3, y + 4, w - 6, 2, C('#ff80d0'));
  blk(p, x - 2, y + h - 6, w + 4, 6, C('#5a5e68'));
  for (let i = 0; i < 4; i++) p.rect(x - 1 + i * 4, y + h - 4, 3, 2, BULB[(i + sd) % 5]);
}

/** Carro na porta: Ford T → sedã → rabo de peixe → caixote → moderno → cápsula elétrica. Turnê vira perua/van/ônibus. */
function car(g: Ctx27, b: B, v: string, k: CarK31, sd: number): void {
  const { p } = g; const { x, y, w, h } = b;
  const body = k === 'police' ? C('#1e2a4a') : k === 'boss' ? C('#1a1a20') : k === 'van' ? C('#6a6e60') : k === 'cab' ? C('#e8c030')
    : [C('#8a2a2a'), C('#2a5a8a'), C('#e8e0d0'), C('#3a6a3a')][sd % 4];
  const big = k === 'tour' && (v === 'boxy' || v === 'modern' || v === 'pod');
  const wh = (cx: number) => { p.disc(cx, y + h - 3, 3, C('#1a1a1e')); p.disc(cx, y + h - 3, 1, C('#9aa0a8')); };
  p.rect(x + 2, y + h - 1, w - 4, 1, withAlpha(C('#000000'), 70)); // sombra no asfalto
  if (big) { // ônibus/van da turnê
    blk(p, x, y, w, h - 3, body);
    for (let i = 0; i < Math.floor((w - 14) / 7); i++) p.rect(x + 3 + i * 7, y + 2, 5, 4, C('#2a3a4a'));
    p.rect(x + w - 9, y + 2, 7, 5, withAlpha(C('#a8d8f0'), 200));
    p.rect(x + 2, y + 7, w - 4, 1, lv(body, 4.4));
    wh(x + 8); wh(x + w - 9);
    return;
  }
  if (v === 't') { // Ford T: alto, capota quadrada, rodas finas de raio
    blk(p, x + 8, y, 16, 8, C('#1a1a20')); p.rect(x + 10, y + 2, 5, 4, withAlpha(C('#a8d8f0'), 160));
    blk(p, x + 2, y + 6, w - 8, 5, body);
    p.disc(x + 8, y + h - 3, 3, C('#3a3a40')); p.disc(x + w - 12, y + h - 3, 3, C('#3a3a40')); p.put(x + 8, y + h - 3, C('#c8c0b0')); p.put(x + w - 12, y + h - 3, C('#c8c0b0'));
    p.put(x + 2, y + 7, C('#ffe0a0'));
    return;
  }
  const roof = v === 'sedan' ? 7 : v === 'fins' ? 5 : v === 'pod' ? 9 : 6;
  // cabine
  const cx0 = x + (v === 'fins' ? 12 : 10), cw = v === 'pod' ? w - 16 : w - 22;
  if (v === 'sedan') p.ellipse(cx0 + (cw >> 1), y + roof, cw >> 1, roof, body); else blk(p, cx0, y, cw, roof + 1, body);
  p.rect(cx0 + 2, y + 2, Math.max(3, (cw >> 1) - 3), roof - 3, withAlpha(C('#a8d8f0'), 180));
  p.rect(cx0 + (cw >> 1) + 1, y + 2, Math.max(3, (cw >> 1) - 3), roof - 3, withAlpha(C('#a8d8f0'), 180));
  // carroceria
  blk(p, x, y + roof, w, h - roof - 2, body);
  p.rect(x + 1, y + roof + 1, w - 2, 1, lv(body, 4.4));
  if (v === 'fins') { p.poly([[x + w - 6, y + roof], [x + w, y + roof - 3], [x + w, y + roof]], body); p.rect(x + 2, y + h - 5, w - 4, 1, C('#e8e8f0')); } // rabo de peixe e friso cromado
  p.rect(x, y + roof + 2, 2, 2, C('#ffe0a0')); p.rect(x + w - 2, y + roof + 2, 2, 2, C('#e83030'));
  if (k === 'police') { p.rect(cx0 + (cw >> 1) - 3, y - 2, 3, 2, C('#e83030')); p.rect(cx0 + (cw >> 1), y - 2, 3, 2, C('#3080ff')); p.rect(x + 6, y + roof + 3, w - 12, 2, C('#e8e8f0')); }
  if (k === 'cab') for (let i = 0; i < 4; i++) p.put(x + 8 + i * 2, y + roof + 3, i % 2 ? C('#1a1a1e') : C('#e8e8f0'));
  if (k === 'van') p.rect(x + w - 16, y + roof + 1, 1, h - roof - 4, lv(body, 1)); // porta de correr
  wh(x + 8); wh(x + w - 9);
}

/** Cartaz de procurado: papel sépia com desenho → foto em P&B → impresso a cores. */
function wanted(g: Ctx27, b: B, v: string, sd: number): void {
  const { p } = g; const { x, y, w, h } = b;
  const paper = v === 'sepia' ? C('#e8d4a8') : v === 'photo' ? C('#e8e6e0') : C('#f4f4f0');
  blk(p, x, y, w, h, paper);
  p.rect(x + 1, y + 1, w - 2, 5, v === 'print' ? C('#c8302c') : C('#3a2a24'));
  for (let i = 0; i < 3; i++) p.rect(x + 3 + i * 4, y + 3, 2, 1, C('#f8f0dc')); // letreiro (ilegível de longe)
  // rosto
  const face = v === 'sepia' ? C('#8a6a4a') : v === 'photo' ? C('#6a6a6a') : C('#c89878');
  p.rect(x + 4, y + 8, w - 8, 9, v === 'print' ? C('#9ab0c8') : lv(paper, 1.6));
  p.disc(x + (w >> 1), y + 11, 2.5, face); p.rect(x + (w >> 1) - 3, y + 14, 7, 3, face);
  if ((sd & 1) === 0) p.rect(x + (w >> 1) - 2, y + 10, 5, 1, C('#1a1a22')); // óculos escuros
  p.rect(x + 3, y + h - 4, w - 6, 1, C('#4a4440'));
}

/** Som do palco: corneta no poste → colunas → pilhas de amplificador → torres de PA → line array pendurado → projetor de holograma. */
function pa(g: Ctx27, b: B, v: string): void {
  const { p } = g; const { x, y, w, h } = b;
  if (v === 'horn') {
    p.rect(x + (w >> 1), y + 8, 1, h - 8, C('#4a4440'));
    p.poly([[x + (w >> 1), y + 6], [x, y], [x, y + 12]], C('#c89a3a'));
    p.line(x + (w >> 1), y + 6, x + 1, y + 1, lv(C('#c89a3a'), 4.6));
    p.rect(x + (w >> 1) - 2, y + h - 2, 5, 2, C('#3a3a40'));
    return;
  }
  if (v === 'column') { blk(p, x + 2, y + 2, w - 4, h - 2, C('#5a4030')); for (let yy = y + 5; yy < y + h - 3; yy += 6) p.disc(x + (w >> 1), yy + 2, 2.5, C('#2a2020')); return; }
  if (v === 'stack') { for (let i = 0; i < 3; i++) { const yy = y + i * 11; blk(p, x, yy, w, 11, C('#1e1a1e')); p.rect(x + 2, yy + 2, w - 4, 6, C('#3a3036')); p.rect(x + 2, yy + 9, 3, 1, C('#e8e0c8')); } return; }
  if (v === 'tower') { blk(p, x, y, w, h, C('#1a1a1e')); for (let i = 0; i < 3; i++) p.disc(x + (w >> 1), y + 6 + i * 10, 4, C('#3a3a42')); p.rect(x + 2, y + h - 4, w - 4, 1, C('#5a5a62')); return; }
  if (v === 'array') { p.rect(x + (w >> 1), y, 1, 8, C('#6a6e78')); for (let i = 0; i < 6; i++) { const yy = y + 8 + i * 7, dx = Math.round(i * i * 0.25); blk(p, x + dx, yy, w - 1, 6, C('#1e1e24')); p.rect(x + dx + 2, yy + 2, w - 5, 1, C('#4a4a52')); } return; }
  // holograma
  blk(p, x, y + h - 8, w, 8, C('#2a2e3a')); p.rect(x + 3, y + h - 7, w - 6, 2, C('#7af0ff'));
  p.poly([[x + 3, y + h - 8], [x - 4, y], [x + w + 4, y]], withAlpha(C('#7af0ff'), 30));
}

/** Rádio da sala: gramofone → rádio-capelinha → móvel de som → aparelho de som portátil → micro system → caixinha inteligente. */
function radio(g: Ctx27, b: B, v: string, sd: number): void {
  const { p, pal } = g; const { x, y, w, h } = b;
  const tbl = () => { blk(p, x - 1, y + h - 9, w + 2, 2, pal.wood); p.rect(x + 1, y + h - 7, 1, 7, pal.woodDark); p.rect(x + w - 2, y + h - 7, 1, 7, pal.woodDark); };
  tbl();
  const top = y + h - 9;
  if (v === 'gramo') { blk(p, x + 2, top - 6, w - 4, 6, pal.wood); p.disc(x + (w >> 1), top - 7, 3, C('#1a1a1e')); p.poly([[x + 4, top - 8], [x + w - 1, top - 13], [x + w - 1, top - 4]], C('#c89a3a')); return; }
  if (v === 'cathedral') { blk(p, x + 2, top - 12, w - 4, 12, pal.wood); p.ellipse(x + (w >> 1), top - 11, (w >> 1) - 2, 3, pal.wood); p.rect(x + 4, top - 10, w - 8, 6, C('#e8d8a8')); for (let i = 0; i < 3; i++) p.vline(x + 5 + i * 2, top - 10, top - 5, lv(pal.wood, 1)); p.put(x + 5, top - 2, pal.gold); p.put(x + w - 6, top - 2, pal.gold); return; }
  if (v === 'console') { blk(p, x, top - 8, w, 8, pal.woodDark); p.rect(x + 2, top - 6, 6, 4, C('#c8bca0')); p.rect(x + 9, top - 6, w - 11, 1, C('#e8a030')); p.disc(x + w - 4, top - 3, 1.5, C('#9aa0a8')); return; }
  if (v === 'boombox') { blk(p, x, top - 10, w, 10, C('#2a2a30')); p.rect(x + 3, top - 13, w - 6, 3, C('#9aa0a8')); p.disc(x + 4, top - 5, 3, C('#5a5a62')); p.disc(x + w - 5, top - 5, 3, C('#5a5a62')); p.rect(x + 8, top - 8, w - 16, 3, C('#3a4a6a')); p.put(x + 9, top - 7, BULB[sd % 5]); return; }
  if (v === 'micro') { blk(p, x, top - 10, 4, 10, C('#3a3a42')); blk(p, x + w - 4, top - 10, 4, 10, C('#3a3a42')); blk(p, x + 5, top - 8, w - 10, 8, C('#9aa0a8')); p.rect(x + 6, top - 7, w - 12, 2, C('#7af0ff')); return; }
  // caixinha inteligente com anel de luz
  blk(p, x + 4, top - 10, w - 8, 10, C('#3a3e48')); p.ellipse(x + (w >> 1), top - 10, (w >> 1) - 4, 1, C('#7af0ff'));
  p.rect(x + 3, top - 12, w - 6, 1, GLOW(C('#7af0ff'), 60));
}

/** Largura do texto (para quem monta rótulos pintados). */
export const tinyW31 = (s: string): number => textWidth(s.toUpperCase());

/** R31 (POL): vitrine de relíquia (n = peças; 0 = suporte vazio com plaquinha) na caixa dada — mesma arte do ART2. */
export function showcase31(g: Ctx27, b: { x: number; y: number; w: number; h: number }, year: number, n: number, sd = 0): void { relic(g, b, variant31('relic', year), n, sd); }
/** R31 (POL): carro de perfil da época (44×14) com o canto em (x, y). */
export function carSide31(g: Ctx27, x: number, y: number, year: number, k: CarK31 = 'own', sd = 0): void { car(g, { x, y, w: 44, h: 14 }, variant31('car', year), k, sd); }
