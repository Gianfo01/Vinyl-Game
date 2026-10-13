// Rodada 29 (ARTE) — INSÍGNIAS no estilo antigo: SELO DE GÊNERO (24×24: forma pela família, símbolo pelo clima do
// gênero, moldura pela época em que o gênero nasceu), SELO DE MOVIMENTO/CENA (estrela de pontas + símbolo + ano),
// FLÂMULA DE FACÇÃO DE FÃS (20×28: cor, carga e iniciais do ato), MEDALHÃO DE PREMIAÇÃO (32×32: louros, estatueta
// e metal da época) e CABEÇALHO DE PARADA (64×16: "HIT PARADE" pintado → rádio Top 40 → bolha dos 70 → neon →
// contagem dos 90 → brilho dos 2000 → barras de streaming → holograma). PURO e semeado; <img> memorizado.

import { FAMILIES, GENRES, familyOf } from '../../data/world';
import { drawText, fitText, textWidth } from './font';
import { C, Px, dith, hsl, mix, noise, shade, withAlpha, type Col } from './px';
import { K28 as K, OUT28, bmp, h28, pxImg28 } from './art28kit';
import { genreMood28, type Mood28 } from './cover28';
import { relicBand28 } from './relic28';

// ---------------------------------------------------------------- símbolos (10×10)

/** Símbolo de cada clima de gênero (# = cor, + = destaque, o = escuro). */
export const GLYPH29: Record<Mood28, string[]> = {
  jazz: ['......##..', '.....#++#.', '....#..#..', '...#...#..', '..#....#..', '.#.....#..', '##....#...', '#+#..##...', '.###.#....', '..###.....'],
  country: ['...####...', '..#++++#..', '..######..', '##########', '.########.', '..........', '...#..#...', '..#.##.#..', '..#....#..', '...####...'],
  soul: ['...####...', '..#+##+#..', '..######..', '..#+##+#..', '...####...', '....##....', '....##....', '....##....', '...####...', '..######..'],
  rock: ['.......##.', '......#+#.', '.....#.#..', '....#.#...', '..###.....', '.#####....', '#####+#...', '.#####....', '.##..#....', '..##......'],
  pop: ['....#.....', '....#.....', '...###....', '#########.', '.#######..', '..#####...', '..##.##...', '.##...##..', '.#.....#..', '..........'],
  hiphop: ['##########', '#o######o#', '#oo####oo#', '#o##++##o#', '##########', '#o######o#', '#oo####oo#', '#o######o#', '##########', '.#......#.'],
  electronic: ['..........', '....#.....', '...##.....', '..#.#..#..', '.#..#.##..', '#...##.#.#', '....#..#.#', '........#.', '..........', '##########'],
  reggae: ['....##....', '...####...', '..#++++#..', '.#+####+#.', '.#++++++#.', '.########.', '..oooooo..', '..######..', '..++++++..', '..........'],
  latin: ['.##....##.', '#++#..#++#', '####..####', '####..####', '.##....##.', '..#....#..', '..#....#..', '..#....#..', '..#....#..', '..........'],
  brazil: ['...####...', '.##o##o##.', '#o######o#', '##++++++##', '#o#+##+#o#', '##++++++##', '#o######o#', '.##o##o##.', '...####...', '..........'],
  africa: ['.########.', '#+#+#+#+#+', '##########', '.#o####o#.', '..######..', '..#o##o#..', '..######..', '..#o##o#..', '...####...', '...####...'],
  asia: ['....##....', '..######..', '.#+#+#+#+.', '##########', '.#+#+#+#+.', '..######..', '....##....', '....##....', '....##....', '...####...'],
  classical: ['..#....#..', '.#.####.#.', '#.#....#.#', '#.#.##.#.#', '#.#.##.#.#', '#.#.##.#.#', '.#.####.#.', '..######..', '...####...', '..######..'],
  disco: ['...####...', '..#+#+##..', '.#+#+#+##.', '.##+#+#+#.', '.#+#+#+##.', '..#+#+##..', '...####...', '....##....', '....##....', '..........'],
  indie: ['##########', '#++++++++#', '#+o####o+#', '#+o####o+#', '#++++++++#', '##########', '#..####..#', '#..#..#..#', '##########', '..........'],
  britpop: ['...####...', '..#++++#..', '.#+####+#.', '#+##++##+#', '#+#+##+#+#', '#+#+##+#+#', '#+##++##+#', '.#+####+#.', '..#++++#..', '...####...'],
  synth: ['##########', '#o#o##o#o#', '#o#o##o#o#', '#o#o##o#o#', '#+#+##+#+#', '#+#+##+#+#', '##########', '..........', '..........', '..........'],
  metal: ['#........#', '##......##', '.##....##.', '..######..', '.##o##o##.', '.########.', '..##++##..', '..#.##.#..', '...####...', '..........'],
  punk: ['..##......', '.#..#.....', '.#..######', '.#..#....#', '..##.....#', '.........#', '.........#', '....#####.', '....#.....', '...##.....'],
};

const FAM_SHAPE: Record<string, 'disc' | 'hex' | 'shield' | 'diamond' | 'square' | 'star'> = {
  blues_jazz: 'disc', country_folk: 'shield', rnb: 'disc', rock: 'shield', pop: 'star', hiphop: 'square', electronic: 'hex', caribbean: 'disc',
  latin: 'diamond', brazil: 'diamond', africa: 'hex', asia_me: 'disc', europe: 'shield', sacred: 'hex',
};

function shapeIn(sh: string, x: number, y: number, N: number): boolean {
  const c = N / 2 - 0.5, dx = x - c, dy = y - c, R = N / 2 - 1;
  switch (sh) {
    case 'disc': return dx * dx + dy * dy <= R * R;
    case 'hex': return Math.abs(dy) <= R * 0.9 && Math.abs(dx) * 0.87 + Math.abs(dy) * 0.5 <= R * 0.9;
    case 'shield': return x >= 2 && x <= N - 3 && y >= 1 && (y < N * 0.55 || Math.abs(dx) <= (N - 2 - y) * 1.0) && y <= N - 2;
    case 'diamond': return Math.abs(dx) + Math.abs(dy) <= R + 0.5;
    case 'square': return Math.abs(dx) <= R - 1 && Math.abs(dy) <= R - 1;
    case 'star': { const a = Math.atan2(dy, dx); const rr = R * (0.72 + 0.28 * Math.max(0, Math.cos(a * 5 + Math.PI / 2))); return dx * dx + dy * dy <= rr * rr; }
  }
  return false;
}

const famHue = (fam: string): number => FAMILIES.find((f) => f.id === fam)?.hue ?? 200;

/** Selo 24×24 de um gênero (id do gênero). Ano de nascimento → moldura (latão antigo, cromado, neon, pixel). */
export function genreBadgePx29(genre: string): Px {
  const N = 24;
  const p = new Px(N, N);
  const g = GENRES.find((x) => x.id === genre);
  const fam = g?.family ?? familyOf(genre);
  const hue = (famHue(fam) + (h28('gb29', genre) % 30) - 15 + 360) % 360;
  const born = g?.born ?? 1960;
  const band = relicBand28(born);
  const sh = FAM_SHAPE[fam] ?? 'disc';
  const rim = band <= 1 ? K.dgold : band === 2 ? K.dsilver : band === 3 ? hsl(hue + 180, 80, 55) : band === 4 ? K.white : C('#2ee8d8');
  const a = hsl(hue, 60, band >= 3 ? 42 : 36), b = hsl(hue, 55, band >= 3 ? 52 : 46);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!shapeIn(sh, x, y, N)) continue;
    const edge = !shapeIn(sh, x - 1, y, N) || !shapeIn(sh, x + 1, y, N) || !shapeIn(sh, x, y - 1, N) || !shapeIn(sh, x, y + 1, N);
    p.put(x, y, edge ? rim : dith(x, y, y / N) ? a : b);
  }
  // brilho no alto à esquerda
  for (let y = 2; y < 8; y++) for (let x = 3; x < 9; x++) if (p.get(x, y) && p.get(x, y) !== rim && (x + y) % 3 === 0) p.put(x, y, mix(p.get(x, y), K.white, 0.25));
  const m = genreMood28(genre);
  bmp(p, GLYPH29[m], 7, 6, { '#': K.white, '+': band >= 3 ? hsl(hue + 160, 90, 70) : K.gold, o: shade(a, -0.45) });
  // faixa do ano de nascimento (década)
  const yr = `${String(Math.floor(born / 10) * 10).slice(2)}S`;
  p.rect(7, 17, 10, 6, shade(a, -0.4)); drawText(p, yr, 12 - Math.round(textWidth(yr) / 2), 18, rim === K.white ? K.cream : rim);
  p.outline(OUT28);
  return p;
}

export function genreBadgeImg29(genre: string, size = 24): HTMLImageElement {
  const g = GENRES.find((x) => x.id === genre);
  return pxImg28(`gb29:${genre}`, () => genreBadgePx29(genre), size, size, { cls: 'genre29', title: g?.name.pt ?? genre });
}

/** Selo de movimento/cena 28×28: estrela de 12 pontas na cor do gênero-base, símbolo e ano. */
export function movementBadgePx29(id: string, genre: string, year: number): Px {
  const N = 28;
  const p = new Px(N, N);
  const hue = (famHue(familyOf(genre)) + (h28('mv29', id) % 50) - 25 + 360) % 360;
  const pts = 12 + (h28('mvp29', id) % 3) * 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x + 0.5 - 14, dy = y + 0.5 - 14, an = Math.atan2(dy, dx), d = Math.hypot(dx, dy);
    const rr = 11.5 + 1.8 * Math.cos(an * pts);
    if (d <= rr) p.put(x, y, d < 9 ? hsl(hue, 55, 30) : hsl(hue + 25, 70, 55));
  }
  p.ring(14, 14, 9, hsl(hue + 25, 70, 70));
  bmp(p, GLYPH29[genreMood28(genre)], 9, 6, { '#': K.cream, '+': K.gold, o: hsl(hue, 55, 20) });
  const t = String(year);
  drawText(p, t, 14 - Math.round(textWidth(t) / 2), 17, K.cream);
  p.outline(OUT28);
  return p;
}

export function movementBadgeImg29(id: string, genre: string, year: number, size = 28): HTMLImageElement {
  return pxImg28(`mv29:${id}:${genre}:${year}`, () => movementBadgePx29(id, genre, year), size, size, { cls: 'move29' });
}

// ---------------------------------------------------------------- flâmula de facção de fãs

export type Fan29 = 'heart' | 'star' | 'fist' | 'crown' | 'flame' | 'eye' | 'bolt' | 'skull' | 'flower' | 'moon';
export const FAN_CHARGES29: Fan29[] = ['heart', 'star', 'fist', 'crown', 'flame', 'eye', 'bolt', 'skull', 'flower', 'moon'];

/** Carga da facção: pelo tipo/temperamento (palavras do nome) e, no resto, pela semente. */
export function fanChargeOf29(id: string, name = '', kind = ''): Fan29 {
  const s = `${name} ${kind}`.toLowerCase();
  if (/love|amor|heart|cora|sweet|fofo|stan/.test(s)) return 'heart';
  if (/hard|true|raiz|ultra|old|purist|purista|tru/.test(s)) return 'fist';
  if (/royal|queen|king|rainha|rei|army|exér/.test(s)) return 'crown';
  if (/fire|fogo|hot|burn|riot/.test(s)) return 'flame';
  if (/dark|goth|metal|death|caveira/.test(s)) return 'skull';
  if (/night|noite|moon|lua/.test(s)) return 'moon';
  if (/hippie|flower|flor|peace|paz/.test(s)) return 'flower';
  if (/watch|olho|eye|crit/.test(s)) return 'eye';
  return FAN_CHARGES29[h28('fan29', id) % FAN_CHARGES29.length];
}

function fanCharge(p: Px, ch: Fan29, cx: number, cy: number, c: Col, acc: Col): void {
  switch (ch) {
    case 'heart': p.disc(cx - 2, cy - 1, 2.6, c); p.disc(cx + 2, cy - 1, 2.6, c); p.poly([[cx - 4.6, cy], [cx + 4.6, cy], [cx, cy + 5]], c); p.put(cx - 3, cy - 2, acc); break;
    case 'star': { const pts: [number, number][] = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? 2.2 : 5; pts.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); } p.poly(pts, c); break; }
    case 'fist': p.rect(cx - 3, cy - 3, 7, 5, c); for (let i = 0; i < 4; i++) p.put(cx - 3 + i * 2, cy - 3, acc); p.rect(cx - 2, cy + 2, 5, 4, c); p.put(cx + 3, cy, shade(c, -0.3)); break;
    case 'crown': p.poly([[cx - 5, cy + 3], [cx - 5, cy - 3], [cx - 2, cy], [cx, cy - 5], [cx + 2, cy], [cx + 5, cy - 3], [cx + 5, cy + 3]], c); p.put(cx, cy, acc); break;
    case 'flame': p.disc(cx, cy + 2, 3.5, c); p.poly([[cx - 3.5, cy + 2], [cx - 1, cy - 6], [cx + 1, cy - 2], [cx + 2, cy - 4], [cx + 3.5, cy + 2]], c); p.disc(cx, cy + 3, 1.6, acc); break;
    case 'eye': p.ellipse(cx, cy, 5, 3, c); p.disc(cx, cy, 2, acc); p.put(cx, cy, K.ink); break;
    case 'bolt': p.poly([[cx + 1, cy - 6], [cx - 4, cy + 1], [cx - 0.5, cy + 1], [cx - 2, cy + 6], [cx + 4, cy - 1], [cx + 0.5, cy - 1]], c); break;
    case 'skull': p.disc(cx, cy - 1, 4, c); p.rect(cx - 2, cy + 2, 5, 3, c); p.put(cx - 2, cy - 1, K.ink); p.put(cx + 2, cy - 1, K.ink); p.put(cx, cy + 3, K.ink); break;
    case 'flower': for (let i = 0; i < 5; i++) { const an = i * Math.PI * 0.4; p.disc(cx + Math.cos(an) * 3, cy + Math.sin(an) * 3, 1.8, c); } p.disc(cx, cy, 1.6, acc); break;
    case 'moon': p.disc(cx, cy, 4.5, c); p.disc(cx + 2, cy - 1, 3.8, 0); p.put(cx + 3, cy + 3, acc); break;
  }
}

/** Flâmula 20×28 de facção de fãs: rabo de andorinha, cor do ato, carga e iniciais do ato. */
export function fanBannerPx29(id: string, name: string, actName: string, genre: string, kind = ''): Px {
  const W = 20, H = 28;
  const p = new Px(W, H);
  const hue = (famHue(familyOf(genre)) + (h28('fb29', id) % 70) - 35 + 360) % 360;
  const a = hsl(hue, 70, 45), b = hsl(hue + 180, 75, 62);
  const cut = h28('fbc29', id) % 3;
  // haste
  p.hline(0, W - 1, 0, K.dwood); p.hline(0, W - 1, 1, K.wood); p.put(0, 0, K.gold); p.put(W - 1, 0, K.gold);
  for (let y = 2; y < H; y++) for (let x = 1; x < W - 1; x++) {
    if (cut === 0 && y > H - 7 && Math.abs(x + 0.5 - W / 2) < (y - (H - 7)) * 1.4) continue; // rabo de andorinha
    if (cut === 1 && y > H - 9 && Math.abs(x + 0.5 - W / 2) > (H - y) * 1.1) continue; // ponta
    if (cut === 2 && y >= H - 3 && x % 3 === 1) continue; // franja
    p.put(x, y, y < 5 ? b : a);
  }
  if (h28('fbs29', id) % 2) for (let y = 5; y < H - 4; y++) { p.put(3, y, b); p.put(W - 4, y, b); }
  fanCharge(p, fanChargeOf29(id, name, kind), 10, 11, b, K.white);
  const ini = fitText(actName.replace(/^(The|Os|As|O|A)\s+/i, '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase(), 16);
  drawText(p, ini, 10 - Math.round(textWidth(ini) / 2), 18, K.white);
  p.outline(OUT28);
  return p;
}

export function fanBannerImg29(id: string, name: string, actName: string, genre: string, kind = '', size = 20): HTMLImageElement {
  return pxImg28(`fb29:${id}:${actName}:${kind}`, () => fanBannerPx29(id, name, actName, genre, kind), size, (size * 28) / 20, { cls: 'fan29', title: name });
}

// ---------------------------------------------------------------- medalhão de premiação

export type Statue29 = 'gramophone' | 'star' | 'mic' | 'globe' | 'lyre' | 'astronaut' | 'record' | 'note';
export const STATUES29: Statue29[] = ['gramophone', 'star', 'mic', 'globe', 'lyre', 'astronaut', 'record', 'note'];
export function statueOf29(id: string, name: string, year: number): Statue29 {
  const n = name.toLowerCase();
  if (/gram|grammy/.test(n)) return 'gramophone';
  if (/vma|mtv|video/.test(n) && year >= 1981) return 'astronaut';
  if (/latin|world|globo|global/.test(n)) return 'globe';
  if (/classic|erudit|ópera|opera/.test(n)) return 'lyre';
  if (/radio|rádio|voice|voz/.test(n)) return 'mic';
  const opts: Statue29[] = year < 1960 ? ['gramophone', 'lyre', 'note'] : year < 1990 ? ['star', 'record', 'gramophone', 'mic'] : ['star', 'mic', 'globe', 'record', 'note'];
  return opts[h28('st29', id) % opts.length];
}

/** Medalhão 32×32 da cerimônia: coroa de louros, estatueta no centro, fita com as iniciais. */
export function awardSealPx29(id: string, name: string, year: number): Px {
  const N = 32;
  const p = new Px(N, N);
  const band = relicBand28(year);
  const metal = band <= 2 ? K.gold : band <= 4 ? (h28('aw29', id) % 2 ? K.gold : K.silver) : C('#7ff0e8');
  const dm = shade(metal, -0.4), lm = shade(metal, 0.4);
  const hue = h28('awh29', id) % 360;
  p.disc(16, 14, 12.5, hsl(hue, 45, 22)); p.ring(16, 14, 12.5, dm); p.ring(16, 14, 11, metal);
  // louros
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const an = Math.PI / 2 + s * (0.5 + i * 0.32); const x = 16 + Math.cos(an) * 9.5, y = 14 + Math.sin(an) * 9.5; p.ellipse(x, y, 1.6, 1, i % 2 ? metal : lm); }
  const st = statueOf29(id, name, year);
  switch (st) {
    case 'gramophone': p.poly([[13, 9], [21, 6], [21, 13]], metal); p.line(16, 11, 15, 16, dm); p.rect(12, 16, 8, 3, dm); p.hline(12, 19, 16, lm); break;
    case 'star': { const pts: [number, number][] = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? 2.6 : 6; pts.push([16 + Math.cos(an) * rr, 13 + Math.sin(an) * rr]); } p.poly(pts, metal); p.put(14, 11, lm); break; }
    case 'mic': p.disc(16, 9, 3, metal); p.rect(15, 12, 3, 5, dm); p.rect(13, 17, 7, 2, metal); for (let y = 7; y < 11; y++) if (y % 2) p.hline(14, 18, y, dm); break;
    case 'globe': p.disc(16, 12, 5, hsl(200, 60, 45)); p.poly([[13, 10], [16, 9], [17, 12], [14, 14]], hsl(120, 45, 40)); p.ring(16, 12, 5, metal); p.rect(14, 17, 5, 2, metal); break;
    case 'lyre': p.line(12, 7, 13, 16, metal); p.line(20, 7, 19, 16, metal); p.hline(12, 20, 7, metal); p.hline(13, 19, 16, metal); for (let x = 14; x < 19; x += 2) p.vline(x, 8, 15, lm); break;
    case 'astronaut': p.disc(16, 9, 3, metal); p.rect(15, 9, 3, 1, C('#202030')); p.rect(13, 12, 7, 5, metal); p.vline(20, 5, 14, dm); p.rect(21, 5, 3, 2, hsl(hue, 80, 60)); break;
    case 'record': p.disc(16, 12, 5.5, K.black); p.ring(16, 12, 3.5, shade(K.black, 0.3)); p.disc(16, 12, 1.8, metal); break;
    case 'note': p.disc(14, 15, 2.5, metal); p.vline(16, 6, 15, metal); p.line(16, 6, 20, 9, metal); p.line(16, 7, 20, 10, metal); break;
  }
  // fitas
  p.poly([[9, 23], [14, 23], [12, 31], [10, 29], [8, 31]], hsl(hue, 70, 45)); p.poly([[18, 23], [23, 23], [24, 31], [22, 29], [20, 31]], hsl(hue, 70, 40));
  p.rect(8, 22, 16, 5, hsl(hue, 70, 48)); p.hline(8, 23, 22, hsl(hue, 70, 60));
  const ini = fitText(name.replace(/^(The|Os|As|O|A)\s+/i, '').split(/\s+/).filter((w) => w.length > 1).map((w) => w[0]).join('').slice(0, 4).toUpperCase(), 14);
  drawText(p, ini, 16 - Math.round(textWidth(ini) / 2), 22, K.white);
  p.outline(OUT28);
  return p;
}

export function awardSealImg29(id: string, name: string, year: number, size = 32): HTMLImageElement {
  return pxImg28(`aw29:${id}:${relicBand28(year)}`, () => awardSealPx29(id, name, year), size, size, { cls: 'award29', title: name });
}

// ---------------------------------------------------------------- cabeçalho de parada por época

export type ChartHead29 = 'painted' | 'radio' | 'bubble' | 'neon' | 'countdown' | 'gloss' | 'bars' | 'holo';
export const CHART_HEADS29: ChartHead29[] = ['painted', 'radio', 'bubble', 'neon', 'countdown', 'gloss', 'bars', 'holo'];
export function chartHeadOf29(year: number): ChartHead29 {
  return year < 1958 ? 'painted' : year < 1968 ? 'radio' : year < 1980 ? 'bubble' : year < 1990 ? 'neon' : year < 2001 ? 'countdown' : year < 2012 ? 'gloss' : year < 2028 ? 'bars' : 'holo';
}

/** Cabeçalho 64×16 da parada no ano: o estilo da época e o título (ex.: "TOP 40", "HOT 100"). */
export function chartHeaderPx29(title: string, year: number, k = chartHeadOf29(year)): Px {
  const W = 64, H = 16;
  const p = new Px(W, H);
  const t = fitText(title, W - 20);
  const tx = 18 + Math.round((W - 20 - textWidth(t)) / 2);
  switch (k) {
    case 'painted': p.rect(0, 0, W, H, K.cream); p.rect(1, 1, W - 2, H - 2, C('#c83a30')); p.rect(3, 3, W - 6, H - 6, K.cream);
      p.disc(9, 8, 4, K.black); p.disc(9, 8, 1.4, C('#c83a30')); drawText(p, t, tx, 6, C('#7a1a20')); break;
    case 'radio': p.rect(0, 0, W, H, C('#6e4426')); p.rect(2, 2, 14, 12, C('#e8d8b0')); for (let x = 4; x < 15; x += 2) p.vline(x, 4, 12, C('#9a6034'));
      p.rect(18, 3, W - 20, 10, C('#f0e0b0')); for (let x = 19; x < W - 2; x += 3) p.vline(x, 11, 12, C('#5e3a1e')); drawText(p, t, tx, 5, C('#3a2414')); p.vline(30 + (year % 20), 3, 12, C('#e04848')); break;
    case 'bubble': for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.put(x, y, hsl(20 + Math.floor((y + Math.sin(x * 0.2) * 2) / 3) * 18, 80, 55));
      p.disc(9, 8, 6, C('#f8e060')); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; p.put(Math.round(9 + Math.cos(an) * 7), Math.round(8 + Math.sin(an) * 7), C('#f8e060')); }
      for (const [dx, dy] of [[1, 1], [-1, 0], [1, 0], [0, -1]] as const) drawText(p, t, tx + dx, 6 + dy, C('#5a1a30')); drawText(p, t, tx, 6, K.white); break;
    case 'neon': p.rect(0, 0, W, H, C('#120a1c')); for (let x = 0; x < W; x += 4) p.vline(x, 10, H - 1, C('#40205a')); p.hline(0, W - 1, 10, C('#ff3fd0'));
      p.poly([[3, 12], [9, 2], [15, 12]], 0); p.disc(9, 8, 5, (x, y) => (y > 8 && (y - 8) % 2 === 0 ? 0 : mix(C('#ffd23a'), C('#ff3fa0'), (y - 3) / 10)));
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) drawText(p, t, tx + dx, 4 + dy, withAlpha(C('#5ff0ff'), 80)); drawText(p, t, tx, 4, C('#d8ffff')); break;
    case 'countdown': p.rect(0, 0, W, H, C('#1e1a2a')); p.disc(9, 8, 6, K.silver); p.ring(9, 8, 4, C('#a8b0c8')); p.disc(9, 8, 1.5, C('#1e1a2a'));
      for (let x = 0; x < 9; x++) p.put(5 + (x % 3), 5 + Math.floor(x / 3), withAlpha(hsl(x * 40, 90, 70), 160));
      p.rect(18, 3, W - 20, 10, C('#f0c040')); drawText(p, t, tx, 5, C('#1e1a2a')); break;
    case 'gloss': for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.put(x, y, mix(C('#2a6ad0'), C('#0a1a4a'), y / H)); p.rect(0, 0, W, 6, withAlpha(K.white, 60));
      p.disc(9, 8, 5, C('#f8f8ff')); p.poly([[7, 5], [12, 8], [7, 11]], C('#2a6ad0')); drawText(p, t, tx, 6, K.white); break;
    case 'bars': p.rect(0, 0, W, H, C('#121214')); for (let i = 0; i < 5; i++) { const hh = 3 + ((i * 7 + year) % 9); p.rect(2 + i * 3, H - 2 - hh, 2, hh, hsl(140 + i * 8, 70, 50)); }
      drawText(p, t.toLowerCase(), tx, 6, C('#48d870')); p.hline(18, W - 3, 13, C('#2a2a30')); break;
    case 'holo': for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.put(x, y, y % 2 ? C('#0a2a3a') : C('#0e3a4a'));
      p.ring(9, 8, 5, C('#6ff8f0')); p.ring(9, 8, 2, C('#e85ac8')); for (let x = 0; x < W; x++) if (noise(x, 3, year) < 0.1) p.vline(x, 0, H - 1, withAlpha(C('#6ff8f0'), 50));
      drawText(p, t, tx + 1, 6, withAlpha(C('#e85ac8'), 180)); drawText(p, t, tx, 6, C('#e8fcff')); break;
  }
  p.outline(OUT28);
  return p;
}

export function chartHeaderImg29(title: string, year: number, w = 128): HTMLImageElement {
  const k = chartHeadOf29(year);
  return pxImg28(`ch29:${title}:${k}`, () => chartHeaderPx29(title, year, k), w, w / 4, { cls: 'chart29', title });
}
