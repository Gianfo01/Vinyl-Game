// Rodada 28 (ARTE) — RELÍQUIAS em pixel art 24×24 (estilo antigo: paleta curta, contorno escuro, 2–3 tons).
// 48 tipos de peça (guitarras de cada época, baixo, bateria, baquetas, microfones e pedestal, piano, sintetizador,
// fita master, cassete, HD, disco de ouro/platina, acetato/78/45, CD, letra, caderno, setlist, cartaz, ingresso,
// contrato, foto, macacão, jaqueta, vestido, botas, chapéu, óculos, luva, carro, ônibus, jukebox, amplificador,
// troféu, porco inflável, objeto de cena, quadro, sopro, violino, toca-discos, fones, laptop, mesa de som, núcleo
// neural…). O TIPO vem da categoria da peça + palavras do nome (e o papel do músico, no museu); a ÉPOCA muda o modelo
// (microfone de fita → Elvis → bola → condensador; fita de rolo → cassete → HD; acabamento sunburst → candy → listras…)
// e a SEMENTE muda cores e detalhes. Puro (só Px) e determinístico; o <img> sai memorizado (pxImg28).

import { drawText, fitText } from './font';
import { C, Px, dith, hsl, mix, noise, shade, withAlpha, type Col } from './px';
import { K28 as K, OUT28, bevel, h28, pxImg28, rng28 } from './art28kit';
import type { Rng } from '../../core/rng';
import { relicArtOf29, relicPx29 } from './relic29';

export const RELIC_ARTS28 = [
  'guitar', 'hollow', 'vguitar', 'acoustic', 'bass', 'drums', 'sticks', 'mic', 'micstand', 'piano', 'synth', 'tape', 'cassette', 'drive',
  'goldrec', 'platrec', 'record', 'cd', 'lyrics', 'notebook', 'setlist', 'poster', 'ticket', 'contract', 'photo',
  'jumpsuit', 'jacket', 'dress', 'boots', 'hat', 'glasses', 'glove', 'car', 'bus', 'jukebox', 'amp', 'trophy', 'pig', 'prop', 'canvas',
  'horn', 'violin', 'turntable', 'headphones', 'laptop', 'mixer', 'core', 'mirrorball',
] as const;
export type RelicArt28 = (typeof RELIC_ARTS28)[number];

/** Faixa de época dos objetos: 0 <1950 · 1 50–64 · 2 65–79 · 3 80–99 · 4 2000–29 · 5 2030+. */
export const relicBand28 = (y: number): number => (y < 1950 ? 0 : y < 1965 ? 1 : y < 1980 ? 2 : y < 2000 ? 3 : y < 2030 ? 4 : 5);

const has = (re: RegExp, s: string) => re.test(s);
/** Categorias novas da rodada 28 (sim/sys/relics9 RelicKind) que já nomeiam o desenho. */
const DIRECT28 = new Set(['setlist', 'poster', 'ticket', 'contract', 'sticks', 'notebook', 'jukebox', 'amp', 'photo', 'goldrec', 'horn', 'synth']);

/**
 * Tipo de arte de uma relíquia: categoria (RelicKind) + nome (pt/en) + ano + semente.
 * Aceita também as categorias novas da rodada 28 (setlist, poster, ticket…), que mapeiam direto.
 */
export function relicArtOf28(kind: string, name: string, year: number, seed = ''): RelicArt28 {
  const n = name.toLowerCase();
  const hs = h28('kind', seed, name) % 100;
  if (kind === 'goldrec' && has(/platinum|platina|diamond|diamante/, n)) return 'platrec';
  if (DIRECT28.has(kind)) return kind as RelicArt28;
  switch (kind) {
    case 'guitar':
      if (has(/bass|baixo|höfner|hofner/, n)) return 'bass';
      if (has(/acoustic|violão|violao|martin|d-18|j-160|unplugged|folk/, n)) return 'acoustic';
      if (has(/archtop|hollow|lucille|es-\d|gretsch|semi/, n)) return 'hollow';
      if (has(/flying v|explorer|metal/, n)) return 'vguitar';
      if (year < 1965 && hs < 22) return 'hollow';
      if (year >= 1975 && year < 2000 && hs < 18) return 'vguitar';
      if (hs > 84) return 'acoustic';
      return 'guitar';
    case 'bass': return 'bass';
    case 'drums': return has(/stick|baqueta/, n) ? 'sticks' : 'drums';
    case 'mic': return has(/stand|pedestal/, n) || hs < 28 ? 'micstand' : 'mic';
    case 'piano': return has(/synth|moog|organ|órgão|orgao|keyboard|teclado|theremin|mellotron|sintetizador/, n) ? 'synth' : 'piano';
    case 'tape':
      if (year >= 2000) return 'drive';
      if (has(/cassette|cassete|mixtape|demo/, n) || (year >= 1975 && hs < 45)) return 'cassette';
      return 'tape';
    case 'lyrics':
      if (has(/setlist/, n)) return 'setlist';
      if (has(/notebook|caderno|diário|diario|diary/, n)) return 'notebook';
      if (has(/contract|contrato|napkin|guardanapo/, n)) return 'contract';
      return 'lyrics';
    case 'trophy':
      if (has(/platinum|platina/, n)) return 'platrec';
      if (has(/gold record|disco de ouro|framed|emoldurado/, n)) return 'goldrec';
      return 'trophy';
    case 'outfit':
      if (has(/glove|luva/, n)) return 'glove';
      if (has(/glasses|óculos|oculos/, n)) return 'glasses';
      if (has(/boot|bota|slipper|sapat|shoe|sneaker|tênis|tenis/, n)) return 'boots';
      if (has(/hat|chapéu|chapeu|turban|turbante|cap\b|boné/, n)) return 'hat';
      if (has(/cardigan|cardigã|jacket|jaqueta|coat|casaco|blazer/, n)) return 'jacket';
      if (has(/dress|vestido|gown/, n)) return 'dress';
      if (has(/jumpsuit|macacão|macacao|suit|eagle|ziggy|terno/, n)) return 'jumpsuit';
      return (['jumpsuit', 'jacket', 'dress', 'boots', 'hat'] as const)[hs % 5];
    case 'record':
      if (has(/\bcd\b/, n) || (year >= 1990 && hs < 30)) return 'cd';
      if (has(/platinum|platina/, n)) return 'platrec';
      if (has(/gold|ouro/, n)) return 'goldrec';
      return year >= 2015 && hs < 30 ? 'turntable' : 'record';
    case 'car': return has(/bus|ônibus|onibus|\bvan\b|coach/, n) ? 'bus' : 'car';
    case 'glasses': return 'glasses';
    case 'prop':
      if (has(/pig|porco/, n)) return 'pig';
      if (has(/jukebox/, n)) return 'jukebox';
      if (has(/amp|amplif/, n)) return 'amp';
      if (has(/mirror|espelho|disco ball/, n)) return 'mirrorball';
      return year >= 1970 && year < 1985 && hs < 40 ? 'mirrorball' : 'prop';
    case 'art':
      if (has(/photo|foto|polaroid/, n)) return 'photo';
      if (has(/poster|cartaz/, n)) return 'poster';
      return 'canvas';
  }
  return 'prop';
}

/** Instrumento do papel do músico (museu: "instrumentos de lendas"). */
export function relicArtOfRole28(role: string, year: number): RelicArt28 {
  switch (role) {
    case 'vocal': case 'mc': return 'mic';
    case 'guitar': return year < 1960 ? 'hollow' : 'guitar';
    case 'bass': return 'bass';
    case 'drums': return 'drums';
    case 'keys': return year >= 1968 && year < 2000 ? 'synth' : 'piano';
    case 'horns': return 'horn';
    case 'dj': return 'turntable';
    case 'producer': return year < 1975 ? 'tape' : year < 2000 ? 'mixer' : 'laptop';
    case 'strings': return 'violin';
    case 'synthetic': return 'core';
  }
  return 'guitar';
}

// ---------------------------------------------------------------- utilidades de desenho

interface Ctx { r: Rng; y: number; b: number; hue: number; name: string; seed: string }

const N = 24;
type Mask = (x: number, y: number) => boolean;
const disc = (cx: number, cy: number, r: number): Mask => (x, y) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r + 0.3;
const ell = (cx: number, cy: number, rx: number, ry: number): Mask => (x, y) => ((x + 0.5 - cx) / (rx + 0.3)) ** 2 + ((y + 0.5 - cy) / (ry + 0.3)) ** 2 <= 1;
const any = (...ms: Mask[]): Mask => (x, y) => ms.some((m) => m(x, y));
function fillM(p: Px, m: Mask, c: Col | ((x: number, y: number) => Col)): void {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m(x, y)) p.set(x, y, typeof c === 'number' ? c : c(x, y));
}
/** Borda interna escura de uma máscara (dá volume no estilo antigo). */
function rimM(p: Px, m: Mask, c: Col): void {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m(x, y) && (!m(x + 1, y) || !m(x, y + 1))) p.set(x, y, c);
}
function hiM(p: Px, m: Mask, c: Col): void {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m(x, y) && (!m(x - 1, y) || !m(x, y - 1))) p.set(x, y, c);
}
const sparkle = (p: Px, m: Mask, seed: number, c: Col, t = 0.12) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m(x, y) && noise(x, y, seed) < t) p.set(x, y, c); };
const pick = <T>(r: Rng, xs: readonly T[]): T => r.pick(xs);
/** Tinta de papel: mais amarelado quanto mais antigo. */
const paperOf = (b: number): Col => (b <= 1 ? K.oldpaper : b === 2 ? mix(K.oldpaper, K.paper, 0.5) : K.paper);
/** Linha "manuscrita" ondulada. */
function scrawl(p: Px, x0: number, x1: number, y: number, c: Col, seed: number): void {
  for (let x = x0; x <= x1; x++) if (noise(x, y, seed) > 0.12) p.set(x, y + (noise(x >> 1, y, seed + 1) > 0.7 ? -1 : 0), c);
}

/** Acabamento de guitarra pela época e semente. */
function finish(c: Ctx, cx: number, cy: number, R: number): (x: number, y: number) => Col {
  const burn = /burn|queim|fire|fogo|remains|restos/.test(c.name.toLowerCase());
  if (burn) return (x, y) => (noise(x, y, 7) < 0.25 ? K.orange : noise(x, y, 9) < 0.5 ? C('#3a2420') : C('#1e1416'));
  const opts: number[] = c.b === 0 ? [0, 0, 1] : c.b === 1 ? [0, 1, 2, 2] : c.b === 2 ? [0, 3, 4, 2, 5] : c.b === 3 ? [5, 6, 7, 2] : c.b === 4 ? [8, 5, 0, 2] : [9, 9, 2];
  const k = pick(c.r, opts);
  const sb = (x: number, y: number) => { const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.15) / R; return d > 0.82 ? C('#3a1a10') : d > 0.58 ? C('#8a3a18') : C('#e0a040'); };
  switch (k) {
    case 0: return sb;
    case 1: return () => C('#e8d0a0');
    case 2: { const cc = pick(c.r, [C('#e05048'), C('#8ac8e0'), C('#8ad0b0'), C('#f4e8d0'), C('#2a2628'), C('#e8a0c0')]); return (x, y) => (y < cy - 2 && x < cx ? shade(cc, 0.15) : cc); }
    case 3: { const h0 = c.hue; return (x, y) => hsl(h0 + Math.floor((x + y + Math.sin(x * 0.9) * 2) / 3) * 55, 80, 55); }
    case 4: return (x, y) => (noise(x, y >> 1, 3) < 0.2 ? C('#a87038') : C('#c88c4c'));
    case 5: return () => C('#222024');
    case 6: { const bg = pick(c.r, [C('#d83030'), C('#202020'), C('#f4f0e8')]); const st = bg === C('#f4f0e8') ? C('#202020') : C('#f4f0e8'); return (x, y) => ((x * 2 + y * 3 + Math.floor(Math.sin(y * 0.7) * 2)) % 9 === 0 ? st : bg); }
    case 7: { const neon = pick(c.r, [C('#ff4fb0'), C('#a8ff3a'), C('#ffe04a'), C('#4af0ff')]); return (x, y) => (dith(x, y, 0.2) ? shade(neon, -0.2) : neon); }
    case 8: { const base = pick(c.r, [C('#c83a30'), C('#3a6ab0'), C('#f0e8d8'), C('#2a2628')]); return (x, y) => (noise(x >> 1, y >> 1, 11) < 0.18 ? C('#c89060') : base); }
    default: return (x, y) => (((x + y) & 3) === 0 ? C('#9af8ff') : mix(C('#1a5a6a'), C('#6af0f0'), y / N));
  }
}

// ---------------------------------------------------------------- desenhos (24×24)

const DRAW: Record<RelicArt28, (p: Px, c: Ctx) => void> = {
  guitar: (p, c) => {
    const head = pick(c.r, [K.maple, C('#2a2628'), K.wood]);
    p.rect(11, 1, 3, 4, head); p.put(10, 1, K.lgrey); p.put(10, 3, K.lgrey); p.put(14, 2, K.lgrey);
    p.rect(11, 5, 2, 9, c.b <= 1 ? K.maple : K.rose); for (let y = 6; y < 14; y += 2) p.hline(11, 12, y, K.lgrey);
    const body = any(ell(12, 17.5, 6.5, 4.8), disc(8.4, 13.6, 2.3), disc(15.6, 14.2, 1.9));
    fillM(p, body, finish(c, 12, 17, 7)); rimM(p, body, withAlpha(C('#000000'), 70));
    const guard = pick(c.r, [K.white, C('#2a2628'), C('#7a3a20')]);
    p.poly([[9, 14], [13, 14], [15.5, 18], [13, 21], [9.5, 19.5]], guard);
    p.rect(10, 15, 3, 1, K.lgrey); p.rect(11, 17, 3, 1, K.lgrey); p.rect(11, 19, 3, 1, K.dgrey);
    p.put(15, 19, K.lgrey); p.put(16, 20, K.lgrey); p.vline(12, 5, 18, withAlpha(K.white, 90));
  },
  hollow: (p, c) => {
    p.rect(10, 0, 4, 4, C('#2a2628')); p.put(9, 1, K.gold); p.put(9, 3, K.gold); p.put(14, 1, K.gold); p.put(14, 3, K.gold);
    p.rect(11, 4, 2, 8, K.rose); for (let y = 5; y < 12; y += 2) p.hline(11, 12, y, K.lgrey);
    const body = any(ell(12, 16.5, 7.5, 6), ell(12, 11.5, 5, 2.5));
    const cut: Mask = disc(16.8, 10.2, 2.2);
    const m: Mask = (x, y) => body(x, y) && !cut(x, y);
    fillM(p, m, pick(c.r, [0, 1, 2]) === 0 ? finish({ ...c, r: c.r }, 12, 16, 8) : pick(c.r, [C('#a02830'), C('#e8d0a0'), C('#2a2628'), C('#d86828')]));
    hiM(p, m, K.cream); rimM(p, m, shade(K.cream, -0.3));
    p.vline(8, 14, 18, K.ink); p.put(7, 14, K.ink); p.put(9, 18, K.ink); p.vline(16, 14, 18, K.ink); p.put(17, 14, K.ink); p.put(15, 18, K.ink);
    p.rect(11, 15, 3, 1, K.silver); p.rect(11, 19, 3, 1, K.gold); p.poly([[11, 20], [13, 20], [14, 22], [10, 22]], K.gold);
    if (/lucille/i.test(c.name)) drawText(p, 'L', 3, 0, K.gold);
  },
  vguitar: (p, c) => {
    p.poly([[10, 0], [15, 0], [14, 4], [11, 4]], C('#2a2628')); p.put(9, 1, K.lgrey); p.put(15, 2, K.lgrey);
    p.rect(11, 4, 2, 9, K.rose); for (let y = 5; y < 13; y += 2) p.hline(11, 12, y, K.lgrey);
    const fin = finish(c, 12, 18, 9);
    p.poly([[10.5, 12], [13.5, 12], [21.5, 22.5], [17.5, 23], [12, 17.5], [6.5, 23], [2.5, 22.5]], fin);
    p.rect(11, 14, 2, 1, K.ink); p.rect(11, 16, 2, 1, K.ink); p.poly([[8, 20], [9.5, 20], [6, 22]], K.white); p.put(16, 21, K.lgrey); p.put(18, 21, K.lgrey);
  },
  acoustic: (p, c) => {
    p.rect(11, 0, 3, 4, K.dwood); p.put(10, 1, K.gold); p.put(10, 3, K.gold); p.put(14, 1, K.gold); p.put(14, 3, K.gold);
    p.rect(11, 4, 2, 6, K.rose); for (let y = 5; y < 10; y += 2) p.hline(11, 12, y, K.lgrey);
    const body = any(disc(12, 12.5, 4.3), disc(12, 17.8, 5.6));
    const top = c.b === 2 && c.r.chance(0.4) ? (x: number, y: number) => (noise(x >> 1, y >> 1, 4) < 0.15 ? hsl(c.hue + x * 20, 75, 60) : C('#e8c070')) : (c.r.chance(0.25) ? () => C('#7a3a1c') : () => C('#e8c070'));
    fillM(p, body, top); rimM(p, body, K.dwood); hiM(p, body, K.cream);
    p.disc(12, 13.5, 1.9, K.ink); p.ring(12, 13.5, 2.6, K.dwood);
    p.poly([[13.5, 14.5], [16, 15], [15, 17.5]], C('#7a3a20'));
    p.rect(10, 19, 5, 1, K.dbrown); p.vline(12, 4, 19, withAlpha(K.white, 80));
  },
  bass: (p, c) => {
    const violin = /höfner|hofner|violin/i.test(c.name);
    p.rect(11, 0, 3, 3, violin ? K.dwood : K.maple); for (const y of [0, 1, 2]) p.put(10, y, K.lgrey);
    p.rect(11, 3, 2, 11, c.b <= 1 ? K.maple : K.rose); for (let y = 4; y < 14; y += 3) p.hline(11, 12, y, K.lgrey);
    if (violin) {
      const body = any(ell(12, 15, 3.6, 2.6), ell(12, 19.5, 5, 3.4));
      fillM(p, body, finish({ ...c, b: 0 }, 12, 18, 6)); hiM(p, body, K.cream);
      p.rect(11, 15, 3, 1, K.silver); p.rect(11, 18, 3, 1, K.silver); p.rect(10, 21, 5, 1, K.dgrey);
      return;
    }
    const body = any(ell(12, 18.5, 6, 4.3), disc(8, 14.5, 2.1), disc(16.5, 13.8, 2.2));
    fillM(p, body, finish(c, 12, 18, 7)); rimM(p, body, withAlpha(C('#000000'), 70));
    p.poly([[9, 15], [12, 15], [14, 18], [12, 21], [9, 20]], pick(c.r, [K.white, C('#2a2628'), C('#7a3a20')]));
    p.rect(10, 16, 4, 1, K.dgrey); p.rect(11, 20, 4, 1, K.lgrey);
  },
  drums: (p, c) => {
    const skin = /skin|pele|cover|capa/i.test(c.name);
    const shell = c.b === 1 || c.b === 2 ? (x: number, y: number) => (noise(x, y, 5) < 0.4 ? C('#3a3a40') : C('#5a5a64')) : pick(c.r, [() => K.dred, () => C('#2a2628'), () => K.dblue, () => C('#e8e0d0'), () => K.purple]);
    if (!skin) {
      p.ellipse(4, 6, 3.6, 1, K.gold); p.vline(4, 7, 22, K.grey); p.line(4, 22, 2, 23, K.grey); p.line(4, 22, 6, 23, K.grey);
      p.ellipse(20, 5, 3.6, 1, K.gold); p.vline(20, 6, 12, K.grey);
      p.ellipse(3, 12, 2.6, 0.8, K.dgold);
      fillM(p, ell(12, 8.5, 3, 2), shell); p.ellipse(12, 7.5, 2.6, 1, K.white);
      fillM(p, any((x, y) => x >= 18 && x <= 22 && y >= 12 && y <= 20), shell); p.hline(18, 22, 12, K.white); p.vline(19, 21, 22, K.grey); p.vline(21, 21, 22, K.grey);
    }
    const R = skin ? 10 : 6.6;
    const cy = skin ? 12 : 16;
    fillM(p, disc(12, cy, R), shell);
    fillM(p, disc(12, cy, R - 1.3), c.r.chance(0.5) ? K.white : K.cream);
    const band = hsl(c.hue, 70, 45);
    if (skin) {
      p.ring(12, cy, 7, band); p.ring(12, cy, 6.4, K.gold);
      p.rect(5, cy - 2, 14, 5, band); star(p, 12, cy + 0.5, 3.2, 1.4, K.cream); p.put(7, cy, K.gold); p.put(16, cy, K.gold);
    } else {
      p.rect(7, cy - 1, 11, 3, band); p.hline(7, 17, cy - 1, shade(band, 0.3));
    }
    for (let a = 0; a < 8; a++) p.put(Math.round(12 + Math.cos(a * 0.785) * (R - 0.5) - 0.5), Math.round(cy + Math.sin(a * 0.785) * (R - 0.5) - 0.5), K.silver);
  },
  sticks: (p, c) => {
    const w = pick(c.r, [K.maple, C('#2a2628'), C('#c83a30'), K.wood]);
    for (const [x0, y0, x1, y1] of [[3, 21, 20, 3], [4, 3, 21, 20]] as const) { p.line(x0, y0, x1, y1, w); p.line(x0 + 1, y0, x1 + 1, y1, shade(w, -0.2)); }
    p.disc(20.5, 3.5, 1.2, shade(w, 0.25)); p.disc(21.5, 20, 1.2, shade(w, 0.25));
    if (c.r.chance(0.6)) { p.line(4, 19, 6, 17, K.white); p.line(5, 5, 7, 7, K.white); }
    if (c.r.chance(0.4)) p.put(12, 11, K.gold);
  },
  mic: (p, c) => {
    p.ellipse(12, 22, 5, 1.2, K.dgrey);
    if (c.b === 0) { // fita (pílula)
      p.vline(12, 15, 21, K.grey); p.line(7, 9, 9, 15, K.grey); p.line(17, 9, 15, 15, K.grey); p.hline(9, 15, 15, K.grey);
      fillM(p, any(ell(12, 8.5, 4.5, 6.5)), (x, y) => (y % 2 ? C('#c8ccd4') : C('#7a808c')));
      p.rect(8, 7, 8, 2, C('#d8dce4')); if (c.r.chance(0.5)) p.rect(11, 7, 2, 2, K.dred);
    } else if (c.b === 1) { // modelo "Elvis"
      p.vline(12, 15, 21, K.grey);
      fillM(p, any(ell(12, 8.5, 4, 6.5)), (x, y) => (y % 3 === 0 ? C('#f4f4f8') : x < 11 ? C('#c8ccd4') : C('#8a90a0')));
      p.rect(10, 14, 5, 2, K.dsilver);
    } else if (c.b <= 3) { // bola
      p.line(12, 22, 14, 18, K.black);
      fillM(p, (x, y) => y >= 9 && y <= 19 && Math.abs(x + 0.5 - 12) <= 1.2 + (19 - y) * 0.12, c.r.chance(0.3) ? K.gold : K.black);
      fillM(p, disc(12, 6, 4.2), (x, y) => (dith(x, y, 0.5) ? C('#9aa0aa') : C('#d8dce4')));
      p.hline(9, 15, 9, K.dsilver); p.set(10, 4, K.white);
    } else if (c.b === 4) { // condensador de estúdio
      p.ring(12, 11, 6.5, K.dgrey); p.vline(12, 17, 21, K.grey);
      fillM(p, (x, y) => x >= 9 && x <= 14 && y >= 3 && y <= 15, (x, y) => (y < 9 ? (dith(x, y, 0.5) ? K.lgold : K.gold) : K.dgold));
      p.hline(9, 14, 9, K.dgold);
    } else { // núcleo de voz neural
      p.vline(12, 13, 21, K.grey); fillM(p, disc(12, 8, 4.5), (x, y) => mix(C('#6ff8f0'), C('#e85ac8'), y / 12)); p.ring(12, 8, 5.5, withAlpha(C('#6ff8f0'), 140));
    }
  },
  micstand: (p, c) => {
    p.vline(12, 6, 20, K.lgrey); p.vline(13, 6, 20, K.grey);
    p.line(12, 20, 5, 23, K.grey); p.line(13, 20, 20, 23, K.grey); p.vline(12, 21, 23, K.dgrey);
    p.rect(11, 4, 4, 2, K.dgrey);
    fillM(p, disc(13, 2.5, 2.4), (x, y) => (dith(x, y, 0.5) ? C('#9aa0aa') : C('#d8dce4')));
    if (c.r.chance(0.65)) { // lenços amarrados
      const cols = [hsl(c.hue, 80, 55), hsl(c.hue + 120, 70, 60), hsl(c.hue + 220, 70, 55)];
      cols.forEach((cc, i) => { for (let y = 7; y < 15 + i * 2; y++) p.set(11 - i + Math.round(Math.sin(y * 0.7 + i) * 1), y, cc); });
    }
  },
  piano: (p, c) => {
    const wood = c.b <= 1 ? pick(c.r, [C('#7a4a28'), C('#5a3018')]) : c.b === 2 ? pick(c.r, [C('#7a4a28'), C('#f4f0e8'), C('#222024')]) : pick(c.r, [C('#222024'), C('#f4f0e8'), C('#222024')]);
    bevel(p, 2, 4, 20, 17, wood); p.rect(1, 3, 22, 2, shade(wood, 0.12));
    p.rect(6, 7, 12, 3, shade(wood, -0.3)); p.rect(7, 7, 4, 2, K.paper); p.hline(7, 10, 8, K.grey);
    p.rect(2, 12, 20, 3, K.white); p.hline(2, 21, 15, shade(wood, -0.35));
    for (let i = 0; i < 20; i++) { const k = i % 7; if (k === 0 || k === 1 || k === 3 || k === 4 || k === 5) p.vline(3 + i, 12, 13, K.ink); }
    p.rect(3, 19, 2, 4, shade(wood, -0.2)); p.rect(19, 19, 2, 4, shade(wood, -0.2)); p.put(11, 21, K.gold); p.put(13, 21, K.gold);
    if (c.b === 0) { p.put(3, 6, K.gold); p.put(20, 6, K.gold); p.put(3, 5, K.orange); p.put(20, 5, K.orange); }
  },
  synth: (p, c) => {
    if (/theremin/i.test(c.name)) {
      bevel(p, 3, 12, 18, 7, K.wood); p.vline(18, 1, 12, K.silver); p.ring(5, 9, 2.5, K.silver); p.rect(4, 19, 2, 4, K.dwood); p.rect(18, 19, 2, 4, K.dwood); p.put(8, 15, K.gold); p.put(11, 15, K.gold);
      return;
    }
    if (c.b <= 2) {
      p.rect(1, 5, 2, 15, K.wood); p.rect(21, 5, 2, 15, K.wood); bevel(p, 3, 5, 18, 8, C('#2a2628'));
      for (let y = 6; y < 12; y += 3) for (let x = 4; x < 20; x += 3) p.put(x, y, c.r.chance(0.5) ? K.white : K.gold);
      p.rect(3, 13, 18, 6, K.white); for (let i = 0; i < 18; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) p.vline(4 + i, 13, 16, K.ink);
      p.vline(4, 6, 11, K.orange);
    } else if (c.b === 3) {
      bevel(p, 1, 7, 22, 12, C('#5c5856')); p.rect(4, 8, 6, 2, C('#7ad070')); for (let x = 12; x < 21; x += 2) p.put(x, 9, hsl(c.hue + x * 15, 70, 60));
      p.rect(2, 12, 20, 6, K.white); for (let i = 0; i < 20; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) p.vline(3 + i, 12, 15, K.ink);
    } else {
      bevel(p, 1, 6, 22, 13, C('#2a2628'));
      for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) p.rect(3 + i * 4, 8 + j * 4, 3, 3, hsl(c.hue + i * 40 + j * 90, 80, c.b === 5 ? 65 : 55));
      for (let i = 0; i < 4; i++) p.put(19, 8 + i * 2, K.lgrey);
    }
  },
  tape: (p, c) => {
    const box = pick(c.r, [C('#c8a878'), C('#e8e0d0'), C('#b0302c')]);
    bevel(p, 1, 3, 20, 18, box); p.rect(2, 4, 18, 4, K.white);
    const tag = fitText(c.b <= 1 ? 'MSTR' : `TK ${(h28(c.seed) % 9) + 1}`, 17);
    drawText(p, tag, 3, 4, K.dred); scrawl(p, 3, 15, 10, K.dblue, h28(c.seed));
    fillM(p, disc(14, 15, 7.5), C('#c8ccd4')); fillM(p, disc(14, 15, 5.6), C('#5a3a20'));
    for (let a = 0; a < 3; a++) fillM(p, disc(14 + Math.cos(a * 2.09) * 4.2, 15 + Math.sin(a * 2.09) * 4.2, 1.3), C('#e8e8ec'));
    fillM(p, disc(14, 15, 1.8), K.silver); p.put(13, 14, K.ink); p.ring(14, 15, 7.5, K.dsilver);
  },
  cassette: (p, c) => {
    const body = pick(c.r, [C('#2a2628'), C('#e8e4dc'), withAlpha(C('#6a7080'), 230), C('#c83a30')]);
    bevel(p, 1, 5, 22, 14, body);
    const lab = pick(c.r, [K.cream, K.yellow, K.white, C('#f0a0b8')]);
    p.rect(3, 6, 18, 6, lab); p.hline(3, 20, 7, hsl(c.hue, 70, 50)); scrawl(p, 4, 17, 9, K.dblue, h28(c.seed, 'c'));
    p.rect(6, 12, 12, 4, shade(body, -0.3)); p.disc(8.5, 14, 1.6, K.white); p.disc(15.5, 14, 1.6, K.white); p.put(8, 13, K.ink); p.put(15, 13, K.ink);
    p.rect(9, 13, 6, 2, C('#5a3a20')); p.poly([[6, 19], [18, 19], [17, 17], [7, 17]], shade(body, -0.2));
    p.put(2, 6, K.grey); p.put(21, 6, K.grey); p.put(2, 17, K.grey); p.put(21, 17, K.grey);
  },
  drive: (p, c) => {
    if (c.r.chance(0.35)) { // pendrive
      p.rect(9, 2, 6, 4, K.silver); p.rect(10, 3, 1, 1, K.ink); p.rect(13, 3, 1, 1, K.ink); bevel(p, 7, 6, 10, 16, hsl(c.hue, 55, 45)); p.rect(9, 10, 6, 8, K.white); scrawl(p, 10, 13, 12, K.ink, 3); scrawl(p, 10, 13, 15, K.ink, 4);
      return;
    }
    bevel(p, 4, 2, 16, 20, c.b === 5 ? C('#1a3a4a') : pick(c.r, [C('#3a3a40'), C('#d0d4dc'), C('#2a2628')]));
    p.put(17, 4, c.b === 5 ? K.teal : K.blue); p.rect(6, 9, 12, 7, K.white);
    drawText(p, 'MIX', 8, 10, K.dred); scrawl(p, 7, 16, 14, K.ink, h28(c.seed));
    p.rect(9, 19, 6, 2, K.dgrey);
  },
  goldrec: (p, c) => recFrame(p, c, K.gold, K.dgold),
  platrec: (p, c) => recFrame(p, c, K.silver, K.dsilver),
  record: (p, c) => {
    const acetate = /acetate|acetato|demo/i.test(c.name);
    const sleeve = c.b <= 1 ? pick(c.r, [C('#c8a878'), C('#e8dcc0')]) : hsl(c.hue, 55, 50);
    bevel(p, 1, 3, 15, 17, sleeve);
    if (c.b <= 1) { p.disc(8.5, 11.5, 3.5, shade(sleeve, -0.4)); p.disc(8.5, 11.5, 1, sleeve); }
    else { const m = c.r.int(0, 2); if (m === 0) p.disc(8, 11, 4, hsl(c.hue + 160, 70, 60)); else if (m === 1) for (let y = 5; y < 19; y += 3) p.hline(2, 14, y, hsl(c.hue + 60, 70, 60)); else p.poly([[3, 18], [8, 6], [13, 18]], hsl(c.hue + 200, 60, 65)); }
    const vinyl = c.b >= 3 && c.r.chance(0.25) ? hsl(c.hue + 180, 60, 40) : C('#1e1a1c');
    fillM(p, disc(15, 12, 8.2), (x, y) => (Math.floor(Math.hypot(x + 0.5 - 15, y + 0.5 - 12) * 1.3) % 2 ? vinyl : shade(vinyl, 0.1)));
    const label = acetate ? K.silver : c.b === 0 ? C('#7a2a20') : hsl(c.hue + 90, 65, 55);
    p.disc(15, 12, 3, label); if (c.b === 1 || /45|single/i.test(c.name)) p.disc(15, 12, 1.3, K.ink); else p.put(14, 11, K.ink);
    p.set(10, 7, withAlpha(K.white, 120)); p.set(11, 6, withAlpha(K.white, 90));
    if (acetate) scrawl(p, 13, 17, 13, K.dblue, 2);
  },
  cd: (p, c) => {
    bevel(p, 2, 2, 20, 20, withAlpha(C('#c8d0dc'), 200)); p.rect(2, 2, 2, 20, C('#5c5856'));
    fillM(p, disc(13, 12, 8), (x, y) => mix(C('#d8dce4'), hsl((Math.atan2(y - 11.5, x - 12.5) * 180) / Math.PI + 180, 70, 70), 0.4));
    p.disc(13, 12, 2.6, hsl(c.hue, 60, 60)); p.disc(13, 12, 1, 0); for (const [x, y] of [[12, 11], [13, 11], [12, 12], [13, 12]] as const) p.put(x, y, 0);
    p.set(8, 7, K.white); p.set(9, 7, K.white);
  },
  lyrics: (p, c) => {
    const pp = paperOf(c.b); p.rect(4, 1, 16, 22, pp); p.poly([[17, 1], [20, 1], [20, 4]], 0);
    p.hline(6, 17, 3, hsl(c.hue, 40, 45)); p.put(11, 2, hsl(c.hue, 40, 45));
    const ink = pick(c.r, [K.dblue, K.ink, C('#3a5a30')]);
    for (let y = 6; y < 21; y += 2) scrawl(p, 6, 6 + c.r.int(6, 12), y, ink, h28(c.seed, y));
    p.line(6, 10, 15, 10, K.red); p.line(6, 16, 12, 15, K.red);
    if (c.r.chance(0.6)) p.ring(15, 17, 3, withAlpha(C('#7a4a28'), 120));
  },
  notebook: (p, c) => {
    const leather = c.b <= 1;
    const cov = leather ? C('#6a3a20') : pick(c.r, [hsl(c.hue, 55, 45), C('#2a2628'), C('#e8d070'), C('#3a6ab0')]);
    bevel(p, 4, 2, 16, 20, cov);
    if (leather) { p.rect(16, 11, 5, 2, C('#3a2010')); p.put(19, 11, K.gold); }
    else for (let y = 3; y < 22; y += 2) { p.put(4, y, K.ink); p.put(3, y, K.silver); }
    p.rect(8, 6, 9, 5, K.white); scrawl(p, 9, 15, 8, K.ink, h28(c.seed));
    if (!leather && c.r.chance(0.7)) { p.disc(11, 16, 2.2, hsl(c.hue + 150, 75, 60)); p.put(16, 18, K.yellow); p.put(17, 17, K.yellow); p.put(15, 17, K.yellow); }
  },
  setlist: (p, c) => {
    p.rect(5, 2, 14, 20, K.white);
    p.poly([[3, 1], [9, 3], [8, 5], [2, 3]], withAlpha(C('#8a8a90'), 220)); p.poly([[15, 3], [21, 1], [22, 3], [16, 5]], withAlpha(C('#8a8a90'), 220));
    const ink = c.r.chance(0.8) ? K.ink : K.dred;
    for (let y = 6; y < 20; y += 3) { const len = c.r.int(5, 11); p.rect(7, y, len, 2, ink); }
    p.line(7, 13, 16, 12, K.red);
    for (let y = 16; y < 22; y++) for (let x = 9; x < 15; x++) if (dith(x, y, 0.3) && noise(x, y, 5) < 0.6) p.set(x, y, withAlpha(C('#6a6060'), 90));
  },
  poster: (p, c) => posterDraw(p, c),
  ticket: (p, c) => {
    const col = c.b === 0 ? C('#f0a0b8') : c.b === 1 ? C('#a8d878') : c.b === 2 ? C('#8ab8f0') : c.b === 3 ? C('#f4f0e8') : c.b === 4 ? C('#e8e4dc') : C('#6ff8f0');
    p.rect(1, 6, 22, 12, col); p.disc(1, 12, 1.6, 0); p.disc(23, 12, 1.6, 0);
    for (let y = 6; y < 18; y += 2) p.put(17, y, shade(col, -0.45));
    p.hline(1, 22, 6, shade(col, 0.3)); p.hline(1, 22, 17, shade(col, -0.3));
    if (c.b <= 2) { drawText(p, 'LIVE', 3, 8, K.dred); p.hline(3, 15, 14, shade(col, -0.4)); drawText(p, String(h28(c.seed) % 9 + 1), 19, 9, K.ink); }
    else if (c.b === 3) { p.rect(2, 7, 14, 2, hsl(c.hue, 70, 50)); for (let y = 10; y < 16; y += 2) p.hline(3, 3 + c.r.int(6, 11), y, K.dgrey); drawText(p, 'A', 19, 9, K.ink); }
    else { for (let x = 18; x < 22; x++) if (h28(c.seed, x) & 1) p.vline(x, 8, 15, K.ink); p.rect(3, 8, 6, 6, K.ink); p.rect(4, 9, 4, 4, col); p.put(5, 10, K.ink); p.hline(10, 15, 9, K.dgrey); p.hline(10, 14, 11, K.dgrey); }
    if (c.b <= 3 && c.r.chance(0.4)) p.line(12, 6, 15, 17, withAlpha(K.ink, 60));
  },
  contract: (p, c) => {
    if (/napkin|guardanapo/i.test(c.name)) {
      p.rect(2, 3, 20, 18, K.white); p.vline(12, 3, 20, K.lgrey); p.hline(2, 21, 12, K.lgrey);
      for (let y = 5; y < 18; y += 3) scrawl(p, 4, 4 + c.r.int(8, 14), y, K.dblue, h28(c.seed, y));
      return;
    }
    p.rect(3, 1, 18, 22, paperOf(c.b)); p.rect(5, 3, 14, 2, K.ink);
    for (let y = 7; y < 15; y += 2) p.hline(5, 5 + c.r.int(9, 13), y, K.grey);
    for (let x = 5; x < 15; x++) p.set(x, 18 + Math.round(Math.sin(x * 1.3 + (h28(c.seed) % 5)) * 1.2), K.dblue);
    p.hline(5, 14, 20, K.dgrey);
    p.disc(17.5, 18.5, 2.8, K.dred); p.ring(17.5, 18.5, 1.6, K.red); p.poly([[16, 20], [17, 20], [16, 23]], K.dred); p.poly([[18, 20], [19, 20], [19.5, 23]], K.dred);
    p.vline(5, 0, 4, K.silver); p.vline(7, 0, 3, K.silver); p.hline(5, 7, 0, K.silver);
  },
  photo: (p, c) => {
    const pola = c.b >= 2 && c.b <= 3;
    const fr = c.b <= 1 ? C('#f4f0e8') : K.white;
    p.rect(2, 2, 20, pola ? 20 : 18, fr);
    const x0 = 4, y0 = 4, w = 16, hh = pola ? 13 : 14;
    const bw = c.b <= 1;
    const bg = bw ? C('#5c5856') : hsl(c.hue, 55, 30);
    p.rect(x0, y0, w, hh, bg);
    p.poly([[x0 + 4, y0], [x0 + 12, y0], [x0 + 14, y0 + hh], [x0 + 2, y0 + hh]], withAlpha(bw ? C('#d8d4d0') : C('#fff2b0'), 80));
    const fg = bw ? C('#1e1a1c') : C('#2a1a20');
    p.disc(x0 + 8, y0 + 4, 1.8, fg); p.rect(x0 + 6, y0 + 6, 5, 6, fg); p.line(x0 + 5, y0 + 9, x0 + 12, y0 + 7, fg);
    for (let x = x0; x < x0 + w; x += 2) p.put(x, y0 + hh - 1, fg);
    if (c.b <= 1) for (let x = 2; x < 22; x += 2) { p.put(x, 2, 0); p.put(x + 1, 19, 0); }
    if (c.r.chance(0.5)) p.poly([[1, 4], [5, 1], [6, 3], [2, 6]], withAlpha(C('#f0e8b0'), 200));
    if (pola) scrawl(p, 6, 16, 19, K.dblue, h28(c.seed));
  },
  jumpsuit: (p, c) => {
    const ziggy = /ziggy|bowie|kansai/i.test(c.name);
    const base = ziggy ? C('#e8e0d0') : c.r.chance(0.5) ? K.white : pick(c.r, [C('#2a2628'), hsl(c.hue, 70, 50), K.gold]);
    const pat = (x: number, y: number): Col => ziggy ? hsl(((x * 2 + y) >> 2) * 70 + c.hue, 70, 55) : (x * 3 + y * 5) % 11 === 0 ? K.gold : (x * 7 + y) % 17 === 0 ? K.red : base;
    p.poly([[7, 3], [17, 3], [19, 12], [16, 13], [8, 13], [5, 12]], pat);
    p.poly([[5, 4], [7, 3], [6, 13], [2, 14]], pat); p.poly([[19, 4], [17, 3], [18, 13], [22, 14]], pat);
    p.poly([[8, 13], [12, 13], [11.5, 22], [5.5, 22]], pat); p.poly([[12, 13], [16, 13], [18.5, 22], [12.5, 22]], pat);
    p.rect(9, 1, 6, 3, base); p.poly([[10, 4], [14, 4], [12, 8]], C('#c87050'));
    p.rect(8, 12, 8, 2, K.gold); p.rect(11, 12, 2, 2, K.lgold);
    if (/eagle|águia|aguia/i.test(c.name)) { p.poly([[9, 7], [12, 9], [15, 7], [12, 11]], C('#c83a30')); p.put(12, 8, K.blue); }
  },
  jacket: (p, c) => {
    const card = /cardigan|cardigã/i.test(c.name);
    const base = card ? C('#7a7a40') : c.b === 1 || c.b === 2 ? pick(c.r, [C('#2a2628'), C('#3a6ab0'), C('#8a5ad0')]) : pick(c.r, [C('#2a2628'), C('#3a6ab0'), C('#5a3a20')]);
    const body = (x: number, y: number) => (card && noise(x, y, 3) < 0.25 ? shade(base, -0.2) : base);
    p.poly([[6, 2], [18, 2], [20, 21], [4, 21]], body); p.poly([[6, 2], [3, 4], [1, 18], [4, 18]], body); p.poly([[18, 2], [21, 4], [23, 18], [20, 18]], body);
    p.poly([[10, 2], [14, 2], [12, 9]], K.white);
    if (card) { for (let y = 8; y < 20; y += 3) p.put(12, y, K.cream); p.disc(15, 15, 0.8, C('#3a2a20')); }
    else { p.line(12, 9, 13, 20, K.silver); p.poly([[9, 2], [12, 9], [8, 7]], shade(base, 0.2)); p.poly([[15, 2], [12, 9], [16, 7]], shade(base, 0.2)); for (const [x, y] of [[6, 3], [8, 3], [16, 3], [18, 3]] as const) p.put(x, y, K.silver); if (c.r.chance(0.7)) { p.disc(8, 13, 1, hsl(c.hue, 80, 55)); p.disc(16, 15, 1, hsl(c.hue + 120, 80, 60)); } }
  },
  dress: (p, c) => {
    const base = pick(c.r, [C('#c83a30'), K.silver, K.gold, C('#2a2628'), hsl(c.hue, 70, 55)]);
    const m: Mask = (x, y) => (y >= 2 && y < 10 && Math.abs(x + 0.5 - 12) <= 3.5 + (y < 4 ? 1 : 0)) || (y >= 10 && y <= 22 && Math.abs(x + 0.5 - 12) <= 3.5 + (y - 10) * 0.55);
    fillM(p, m, base); sparkle(p, m, h28(c.seed), K.white, 0.14); sparkle(p, m, h28(c.seed) + 1, shade(base, -0.35), 0.18);
    p.vline(9, 0, 2, base); p.vline(15, 0, 2, base); p.hline(9, 15, 10, shade(base, -0.4));
  },
  boots: (p, c) => {
    const ruby = /ruby|rubi|slipper|sapatinho/i.test(c.name);
    if (ruby || (c.b === 0 && c.r.chance(0.5))) {
      for (const dx of [0, 11]) { const m: Mask = (x, y) => x >= 2 + dx && x <= 10 + dx && y >= 13 && y <= 18 && !(y < 15 && x > 4 + dx && x < 9 + dx); fillM(p, m, C('#c81828')); sparkle(p, m, dx + 3, C('#ff8080'), 0.3); p.rect(3 + dx, 19, 3, 3, C('#7a1018')); p.disc(7 + dx, 14, 1.2, C('#e83848')); }
      return;
    }
    if (c.b >= 3 && c.r.chance(0.6)) { // tênis
      const st = hsl(c.hue, 75, 50);
      for (const dx of [0, 12]) { p.poly([[1 + dx, 12], [6 + dx, 10], [8 + dx, 14], [11 + dx, 16], [11 + dx, 19], [1 + dx, 19]], K.white); p.hline(1 + dx, 11 + dx, 19, K.lgrey); p.line(4 + dx, 15, 6 + dx, 12, st); p.line(5 + dx, 16, 7 + dx, 13, st); p.put(2 + dx, 12, K.dgrey); }
      return;
    }
    const col = c.b === 2 ? pick(c.r, [K.silver, K.gold, C('#c83a30'), C('#3a6ab0')]) : pick(c.r, [C('#2a2628'), C('#7a4a28')]);
    for (const dx of [0, 11]) {
      p.rect(3 + dx, 1, 6, 15, col); p.poly([[3 + dx, 14], [9 + dx, 14], [12 + dx, 17], [3 + dx, 17]], col);
      p.rect(2 + dx, 17, 10, c.b === 2 ? 5 : 2, c.b === 2 ? shade(col, -0.35) : K.black); if (c.b === 2) sparkle(p, (x, y) => x >= 3 + dx && x <= 8 + dx && y >= 1 && y < 14, dx, K.white, 0.15);
      p.vline(4 + dx, 2, 13, shade(col, 0.3));
    }
  },
  hat: (p, c) => {
    const n = c.name.toLowerCase();
    if (/turban|turbante|baiana|carmen/.test(n)) {
      p.poly([[5, 20], [19, 20], [18, 9], [6, 9]], hsl(c.hue, 70, 55)); for (let y = 11; y < 20; y += 3) p.line(6, y, 18, y - 2, hsl(c.hue + 40, 75, 65));
      p.disc(8, 7, 2.5, C('#f0d040')); p.disc(13, 5, 2.6, C('#e04848')); p.disc(17, 7.5, 2.2, C('#48b85c')); p.disc(11, 8, 1.8, C('#f08a2c')); p.disc(15, 3, 1.6, C('#8a5ad0'));
      return;
    }
    const kind = /cowboy|stetson/.test(n) ? 0 : c.b <= 1 ? pick(c.r, [1, 2]) : pick(c.r, [0, 1, 2, 3]);
    const col = pick(c.r, [C('#2a2628'), C('#7a4a28'), C('#e8dcc0'), hsl(c.hue, 50, 40)]);
    if (kind === 0) { p.ellipse(12, 16, 11, 3, col); p.poly([[6, 15], [8, 6], [11, 8], [13, 8], [16, 6], [18, 15]], col); p.hline(7, 17, 13, K.dbrown); p.ellipse(12, 15, 5, 1, shade(col, -0.3)); }
    else if (kind === 1) { p.ellipse(12, 16, 10, 2.4, col); p.poly([[6, 15], [7, 7], [12, 6], [17, 7], [18, 15]], col); p.rect(6, 13, 13, 2, K.ink); p.line(10, 7, 12, 9, shade(col, -0.3)); }
    else if (kind === 2) { p.ellipse(12, 19, 10, 2.2, col); p.rect(7, 3, 11, 16, col); p.rect(7, 15, 11, 2, K.dred); p.hline(7, 17, 3, shade(col, 0.25)); }
    else { p.ellipse(12, 13, 8, 4, col); p.disc(12, 9.5, 1, shade(col, -0.3)); p.ellipse(12, 16, 7.5, 1.2, shade(col, -0.25)); }
  },
  glasses: (p, c) => {
    const n = c.name.toLowerCase();
    const kind = /holly/.test(n) ? 1 : /lennon|round|redond/.test(n) ? 0 : c.b <= 1 ? pick(c.r, [0, 1, 4]) : c.b === 2 ? pick(c.r, [0, 2, 3]) : pick(c.r, [1, 2, 3, 4]);
    const frame = kind === 0 ? K.gold : kind === 1 ? C('#1e1a1c') : kind === 2 ? K.dgold : kind === 3 ? C('#e83888') : C('#2a2628');
    const lens = kind === 2 ? withAlpha(C('#5a3a20'), 220) : kind === 3 ? withAlpha(C('#f0a0c8'), 200) : withAlpha(C('#a8c8e0'), 160);
    const L = (cx: number) => {
      if (kind === 0) { p.disc(cx, 12, 3.8, lens); p.ring(cx, 12, 3.8, frame); }
      else if (kind === 1) { p.rect(cx - 4, 9, 8, 6, frame); p.rect(cx - 3, 10, 6, 4, lens); }
      else if (kind === 2) { p.ellipse(cx, 12.5, 4, 3.4, frame); p.ellipse(cx, 12.5, 3, 2.4, lens); }
      else if (kind === 3) { p.disc(cx - 1.5, 11, 2, frame); p.disc(cx + 1.5, 11, 2, frame); p.poly([[cx - 3.6, 11.5], [cx + 3.6, 11.5], [cx, 16]], frame); p.disc(cx, 12, 1.5, lens); }
      else { p.poly([[cx - 4, 10], [cx + 4, 9], [cx + 3, 15], [cx - 3, 15]], frame); p.poly([[cx - 3, 11], [cx + 3, 10], [cx + 2, 14], [cx - 2, 14]], lens); }
    };
    L(6.5); L(17.5); p.hline(10, 13, 11, frame); p.line(2, 10, 0, 8, frame); p.line(21, 10, 23, 8, frame);
    p.set(5, 10, withAlpha(K.white, 200)); p.set(16, 10, withAlpha(K.white, 200));
  },
  glove: (p, c) => {
    const col = pick(c.r, [K.white, K.silver, C('#2a2628')]);
    const m: Mask = (x, y) => (y >= 11 && y <= 22 && x >= 7 && x <= 16) || [8, 10, 12, 14].some((fx, i) => x >= fx && x <= fx + 1 && y >= 3 + (i === 0 || i === 3 ? 2 : 0) && y < 12) || (x >= 3 && x <= 7 && y >= 11 && y <= 15 && x + y >= 16);
    fillM(p, m, col); sparkle(p, m, h28(c.seed), col === K.white ? K.lgrey : K.white, col === K.white ? 0.25 : 0.1); p.hline(7, 16, 20, shade(col, -0.25));
  },
  car: (p, c) => carDraw(p, c),
  bus: (p, c) => {
    const col = c.b <= 2 ? pick(c.r, [K.silver, C('#e8d070'), C('#3a6ab0')]) : pick(c.r, [C('#2a2628'), K.white, hsl(c.hue, 55, 45)]);
    if (c.b <= 2) p.poly([[1, 18], [1, 9], [4, 6], [22, 6], [23, 9], [23, 18]], col); else bevel(p, 1, 6, 22, 12, col);
    for (let x = 3; x < 21; x += 3) p.rect(x, 8, 2, 3, C('#2a3040'));
    p.rect(20, 8, 3, 6, C('#2a3040')); p.hline(1, 22, 13, hsl(c.hue + 150, 70, 55)); p.hline(1, 22, 14, hsl(c.hue + 150, 70, 40));
    p.disc(6, 18.5, 2.6, K.ink); p.disc(18, 18.5, 2.6, K.ink); p.disc(6, 18.5, 1, K.silver); p.disc(18, 18.5, 1, K.silver);
    if (/accident|acidente|crash/i.test(c.name)) { p.line(13, 7, 16, 12, K.ink); p.line(15, 7, 13, 11, K.ink); }
  },
  jukebox: (p, c) => {
    const body = pick(c.r, [K.wood, C('#c83a30'), C('#f4f0e8')]);
    p.disc(12, 9, 9, body); p.rect(3, 9, 18, 14, body);
    for (let i = 0; i < 4; i++) p.ring(12, 9.5, 8 - i * 0.9, hsl(c.hue + i * 60, 85, 60));
    p.rect(7, 7, 10, 5, C('#2a3040')); p.disc(12, 10, 2.2, K.black); p.put(12, 10, K.gold);
    p.rect(6, 14, 12, 7, C('#2a2628')); for (let y = 15; y < 21; y++) for (let x = 7; x < 17; x++) if (dith(x, y, 0.5)) p.put(x, y, K.gold);
    p.vline(4, 10, 21, hsl(c.hue + 200, 85, 60)); p.vline(19, 10, 21, hsl(c.hue + 30, 85, 60)); p.hline(3, 20, 22, K.silver);
  },
  amp: (p, c) => {
    const tolex = c.b <= 1 ? C('#c8a868') : c.b === 2 ? pick(c.r, [C('#2a2628'), C('#7a4a28')]) : C('#2a2628');
    const grill = c.b <= 1 ? C('#8a6a40') : pick(c.r, [C('#d0ccc0'), C('#7a2a30'), C('#e8dcc0')]);
    const stack = c.b >= 2 && c.b <= 3 && c.r.chance(0.45);
    const y0 = stack ? 1 : 4;
    bevel(p, 2, y0, 20, stack ? 6 : 18, tolex);
    if (c.b <= 1) for (let y = y0; y < 22; y++) for (let x = 2; x < 22; x++) if ((x + y) % 4 === 0) p.set(x, y, shade(tolex, -0.18));
    p.rect(3, y0 + 1, 18, 2, stack ? K.gold : K.silver); for (let x = 5; x < 20; x += 2) p.put(x, y0 + 1, K.ink);
    if (stack) { bevel(p, 2, 8, 20, 15, tolex); p.rect(4, 10, 16, 11, grill); p.hline(4, 19, 15, shade(grill, -0.3)); p.vline(11, 10, 20, shade(grill, -0.3)); p.rect(5, 2, 4, 2, K.white); }
    else { p.rect(4, y0 + 4, 16, 12, grill); for (let y = y0 + 5; y < y0 + 16; y += 2) p.hline(4, 19, y, shade(grill, -0.15)); p.rect(5, y0 + 5, 5, 2, K.white); }
  },
  trophy: (p, c) => {
    const n = c.name.toLowerCase();
    const kind = /moonman|astronaut|astronauta/.test(n) ? 1 : /gramophone|gramofone|gramófono|grammy/.test(n) ? 0 : /cup|taça|taca/.test(n) ? 2 : pick(c.r, [0, 0, 2, 3]);
    const gold = kind === 1 ? K.silver : K.gold;
    const dg = kind === 1 ? K.dsilver : K.dgold;
    bevel(p, 6, 19, 12, 4, C('#2a2628')); p.rect(8, 20, 8, 1, K.gold);
    if (kind === 0) { p.rect(9, 16, 6, 3, gold); p.rect(11, 12, 2, 4, dg); p.poly([[12, 12], [20, 2], [22, 6], [13, 13]], gold); p.ring(21, 4, 2, dg); p.disc(9, 14, 2.6, gold); p.put(9, 14, dg); }
    else if (kind === 1) { p.rect(10, 17, 4, 2, gold); p.disc(12, 7, 3.2, gold); p.rect(10, 9, 5, 8, gold); p.rect(10, 6, 4, 2, C('#4a5a70')); p.vline(16, 2, 17, K.grey); p.rect(17, 2, 5, 3, hsl(c.hue, 70, 55)); }
    else if (kind === 2) { p.poly([[6, 3], [18, 3], [16, 11], [8, 11]], gold); p.rect(11, 11, 2, 6, dg); p.rect(9, 16, 6, 3, gold); p.ring(5, 6, 2.2, gold); p.ring(19, 6, 2.2, gold); p.vline(8, 4, 9, K.lgold); }
    else { p.rect(10, 13, 4, 6, dg); star(p, 12, 8, 6, 2.6, gold); p.put(10, 6, K.lgold); }
  },
  pig: (p, c) => {
    const q = new Px(N, N);
    const body = c.r.pick([C('#f0a8b8'), C('#f4c0c8'), C('#e898a8')]);
    const dk = shade(body, -0.2);
    q.vline(12, 17, 17 + c.r.int(3, 6), c.r.pick([K.grey, K.dbrown, K.white]));
    q.ellipse(12, 10, 9, 5.5, body); q.ellipse(4, 9.5, 2.4, 2.2, body); q.ellipse(2.5, 9.5, 1, 1.4, shade(body, -0.3));
    q.poly([[6, 4], [8, 2], [9, 5]], dk); q.put(6, 8, K.ink);
    for (const x of [7, 10, 15, 18]) q.rect(x, 14, 2, 3, dk);
    q.line(21, 9, 23, 7, shade(body, -0.3)); q.hline(8, 18, 6, withAlpha(K.white, 120));
    if (c.r.chance(0.4)) q.disc(15, 10, 2, C('#f8f0f0'));
    p.blit(q, 0, c.r.int(0, 2), c.r.chance(0.5));
  },
  prop: (p, c) => {
    const k = /smash|quebr|pieces|pedaç/i.test(c.name) ? 2 : c.b === 0 ? 0 : pick(c.r, [0, 1, 3]);
    if (k === 0) { p.ellipse(12, 11, 8, 9, K.white); p.disc(9, 9, 1.8, K.ink); p.disc(15, 9, 1.8, K.ink); p.poly([[8, 14], [16, 14], [12, 18]], K.dred); p.vline(12, 20, 23, K.dbrown); p.line(4, 4, 6, 8, K.gold); }
    else if (k === 1) { for (let i = 0; i < 5; i++) { const a = i * 1.26; p.ellipse(12 + Math.cos(a) * 5, 9 + Math.sin(a) * 5, 3.5, 3.5, hsl(c.hue + i * 30, 75, 60)); } p.disc(12, 9, 2.6, K.yellow); p.vline(12, 14, 23, K.dgreen); p.ellipse(9, 18, 3, 1.2, K.green); }
    else if (k === 2) { p.poly([[3, 20], [9, 14], [11, 17], [6, 22]], finish(c, 7, 18, 5)); p.poly([[13, 15], [19, 12], [21, 16], [15, 19]], finish(c, 17, 15, 5)); p.line(10, 12, 20, 2, K.rose); p.line(9, 13, 6, 9, K.lgrey); p.put(12, 22, K.gold); }
    else { p.rect(5, 6, 14, 14, C('#c8302c')); p.rect(6, 7, 12, 12, C('#e8d070')); p.disc(12, 13, 3.5, C('#c8302c')); p.hline(5, 18, 5, K.gold); }
  },
  mirrorball: (p, c) => {
    const sd = h28('mb', c.seed);
    p.vline(12, 0, 4, K.grey);
    fillM(p, disc(12, 13, 8.5), (x, y) => { const v = noise(x >> 1, y >> 1, sd); return (x % 2 === 0 || y % 2 === 0) ? C('#7a808c') : v > 0.8 ? K.white : v > 0.45 ? C('#d8dce4') : C('#a8acb8'); });
    p.set(8, 9, K.white); p.set(9, 8, K.white);
    for (let i = 0; i < 4; i++) p.put(c.r.int(0, 23), c.r.int(2, 23), hsl(c.hue + i * 70, 85, 65));
  },
  canvas: (p, c) => {
    const frame = pick(c.r, [K.gold, K.dwood, C('#2a2628')]);
    bevel(p, 2, 2, 20, 18, frame); p.rect(4, 4, 16, 14, K.cream);
    const n = c.name.toLowerCase();
    if (/tongue|língua|lingua|lips|lábios/.test(n)) { p.ellipse(12, 10, 6, 3.2, K.red); p.hline(7, 17, 10, K.dred); p.poly([[10, 11], [14, 11], [13, 16], [11, 16]], C('#e86070')); }
    else if (/sketch|esboço|drawing|desenho|design/.test(n)) { for (let i = 0; i < 6; i++) p.line(5 + c.r.int(0, 10), 5 + c.r.int(0, 10), 5 + c.r.int(0, 13), 5 + c.r.int(0, 11), K.dgrey); }
    else { const m = c.r.int(0, 2); if (m === 0) { p.rect(5, 5, 7, 6, hsl(c.hue, 70, 50)); p.rect(12, 9, 7, 8, hsl(c.hue + 150, 60, 55)); p.disc(9, 14, 2.5, hsl(c.hue + 60, 80, 60)); } else if (m === 1) { for (let y = 4; y < 18; y++) for (let x = 4; x < 20; x++) if (Math.floor((x + Math.sin(y * 0.6) * 3) / 4) % 2) p.put(x, y, hsl(c.hue + y * 6, 75, 55)); } else { p.disc(12, 11, 5, hsl(c.hue, 70, 55)); p.ring(12, 11, 6.5, hsl(c.hue + 180, 70, 45)); } }
    if (c.r.chance(0.5)) { p.line(5, 21, 2, 23, K.dwood); p.line(18, 21, 21, 23, K.dwood); }
  },
  horn: (p, c) => {
    const brass = c.r.chance(0.8) ? K.gold : K.silver;
    if (c.r.chance(0.5)) { // trompete
      p.hline(2, 15, 11, brass); p.hline(2, 15, 13, brass); p.poly([[15, 9], [22, 5], [22, 19], [15, 15]], brass); p.vline(22, 6, 18, shade(brass, -0.35));
      for (const x of [7, 9, 11]) { p.vline(x, 8, 14, shade(brass, -0.25)); p.put(x, 7, K.white); } p.rect(1, 11, 2, 3, K.dgrey);
    } else { // saxofone
      p.line(8, 2, 6, 6, K.dgrey); p.poly([[6, 6], [9, 6], [11, 17], [8, 17]], brass); p.disc(11, 18.5, 3.5, brass); p.poly([[11, 16], [17, 11], [20, 13], [14, 20]], brass); p.disc(18, 11.5, 2.6, shade(brass, -0.35));
      for (let y = 8; y < 16; y += 2) p.put(10, y, K.lgold);
    }
  },
  violin: (p, c) => {
    const [edge, mid] = c.b >= 4 && c.r.chance(0.5) ? [C('#1e1a1c'), hsl(c.hue, 60, 45)] : c.r.pick([[C('#6a2a10'), C('#b0581c')], [C('#5a3010'), C('#c87828')], [C('#4a1a10'), C('#8a3018')]] as const);
    p.rect(11, 0, 2, 3, K.dwood); p.disc(12, 0.5, 1.2, K.dwood); p.rect(11, 3, 2, 7, K.ink);
    const body = any(ell(12, 13, 4, 3.2), ell(12, 19, 5, 3.6));
    fillM(p, body, (x, y) => (Math.hypot(x - 11.5, y - 16) > 4.5 ? edge : mid)); p.vline(10, 15, 18, K.ink); p.vline(14, 15, 18, K.ink); p.rect(11, 17, 3, 1, K.cream); p.rect(11, 21, 2, 2, K.ink);
    if (c.r.chance(0.7)) { const y0 = c.r.int(18, 23); p.line(2, y0, 21, y0 - 15, K.dbrown); p.line(2, y0 + 1, 21, y0 - 14, withAlpha(K.cream, 160)); }
  },
  turntable: (p, c) => {
    bevel(p, 1, 3, 22, 18, pick(c.r, [K.silver, C('#2a2628')]));
    fillM(p, disc(10, 12, 7.5), (x, y) => (Math.floor(Math.hypot(x + 0.5 - 10, y + 0.5 - 12) * 1.2) % 2 ? C('#1e1a1c') : C('#3a3638')));
    p.disc(10, 12, 2.4, hsl(c.hue, 70, 55)); p.put(9, 11, K.ink);
    p.disc(19.5, 5.5, 1.4, K.lgrey); p.line(19, 6, 18, 15, K.lgrey); p.line(18, 15, 15, 17, K.lgrey); p.rect(14, 16, 2, 2, K.white);
    p.vline(21, 12, 19, K.dgrey); p.rect(20, 15, 3, 1, K.white); p.put(3, 19, K.red);
  },
  headphones: (p, c) => {
    const col = pick(c.r, [C('#2a2628'), K.silver, hsl(c.hue, 60, 50)]);
    for (let a = 0; a <= 20; a++) { const t = Math.PI + (a / 20) * Math.PI; p.set(12 + Math.cos(t) * 8.5, 12 + Math.sin(t) * 9, col); p.set(12 + Math.cos(t) * 7.5, 12 + Math.sin(t) * 8, shade(col, 0.2)); }
    bevel(p, 1, 11, 6, 9, col); bevel(p, 17, 11, 6, 9, col); p.rect(5, 12, 2, 7, K.dgrey); p.rect(17, 12, 2, 7, K.dgrey); p.line(4, 20, 9, 23, K.dgrey);
  },
  laptop: (p, c) => {
    bevel(p, 3, 3, 18, 12, K.dgrey); p.rect(4, 4, 16, 10, C('#101820'));
    for (let x = 5; x < 19; x++) { const hh = Math.round(Math.abs(Math.sin(x * 0.9 + (h28(c.seed) % 7))) * 3); p.vline(x, 9 - hh, 9 + hh, hsl(c.hue + x * 8, 80, 60)); }
    p.poly([[1, 16], [23, 16], [21, 21], [3, 21]], K.silver); for (let y = 17; y < 20; y++) for (let x = 4; x < 20; x += 2) p.put(x, y, K.dgrey);
    p.disc(6, 6.5, 1.2, hsl(c.hue + 120, 80, 60)); p.disc(18, 12, 1.2, K.yellow);
  },
  mixer: (p, c) => {
    p.poly([[1, 8], [23, 8], [23, 21], [1, 21]], C('#3a3a40')); p.rect(1, 4, 22, 4, C('#2a2628'));
    for (let x = 3; x < 22; x += 6) { p.rect(x, 5, 4, 2, K.yellow); p.put(x + 1 + (h28(c.seed, x) % 2), 5, K.red); }
    for (let x = 2; x < 23; x += 2) { p.put(x, 9, hsl(c.hue + x * 12, 70, 60)); p.put(x, 11, K.lgrey); p.vline(x, 13, 20, K.ink); p.rect(x, 14 + (h28(c.seed, x, 'f') % 5), 1, 2, K.white); }
  },
  core: (p, c) => {
    const g1 = c.r.pick([C('#6ff8f0'), C('#a8ff7a'), C('#f8e06a')]), g2 = c.r.pick([C('#e85ac8'), C('#7a8aff'), C('#ff8a5a')]);
    p.poly([[12, 1], [21, 6], [21, 17], [12, 22], [3, 17], [3, 6]], C('#1a3a4a'));
    p.poly([[12, 1], [21, 6], [12, 11], [3, 6]], C('#2a6a7a')); p.poly([[12, 11], [21, 6], [21, 17], [12, 22]], C('#123040'));
    p.line(12, 11, 12, 21, g1); p.line(5, 8, 12, 11, g1); p.line(19, 8, 12, 11, g2); p.disc(12, 11, 1.6, K.white);
    for (let i = 0; i < 5; i++) p.put(c.r.int(5, 18), c.r.int(9, 19), i % 2 ? g2 : g1);
  },
};

function star(p: Px, cx: number, cy: number, ro: number, ri: number, col: Col): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? ri : ro; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  p.poly(pts, col);
}

function recFrame(p: Px, c: Ctx, metal: Col, dark: Col): void {
  const fr = pick(c.r, [C('#2a2628'), K.dwood, K.gold]);
  bevel(p, 0, 0, 24, 24, fr);
  p.rect(2, 2, 20, 20, pick(c.r, [C('#1a2a4a'), C('#2a1418'), C('#1e1a1c'), C('#f4f0e8')]));
  fillM(p, disc(12, 10, 6.6), (x, y) => (Math.floor(Math.hypot(x + 0.5 - 12, y + 0.5 - 10) * 1.4) % 2 ? metal : shade(metal, -0.12)));
  p.disc(12, 10, 2.2, hsl(c.hue, 60, 50)); p.put(11, 9, K.ink);
  p.set(9, 6, K.white); p.set(10, 5, withAlpha(K.white, 160));
  p.rect(6, 18, 12, 3, metal); p.hline(7, 16, 19, dark);
}

function posterDraw(p: Px, c: Ctx): void {
  const x0 = 3, y0 = 1, w = 18, hh = 22;
  const st = c.b;
  if (st <= 1) { // letterpress de luta de boxe / baile
    const paper = K.cream; p.rect(x0, y0, w, hh, paper);
    const a = pick(c.r, [K.red, K.dblue, C('#2a2628')]); const b = pick(c.r, [K.yellow, K.orange, K.pink]);
    p.rect(x0, y0 + 2, w, 5, a); drawText(p, 'LIVE', x0 + 2, y0 + 2, paper);
    p.rect(x0 + 1, y0 + 9, w - 2, 4, b); for (let y = y0 + 15; y < y0 + 21; y += 2) p.hline(x0 + 2, x0 + 2 + c.r.int(8, 13), y, C('#2a2628'));
    p.put(x0 + 15, y0 + 4, paper);
  } else if (st === 2 && c.r.chance(0.6)) { // psicodélico
    for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + w; x++) { const d = Math.hypot(x - 12, y - 10) + Math.sin(Math.atan2(y - 10, x - 12) * 4) * 1.6; p.put(x, y, hsl(c.hue + Math.floor(d / 2.2) * 50, 85, 55)); }
    drawText(p, 'LOVE', x0 + 2, y0 + 15, K.ink); drawText(p, 'LOVE', x0 + 1, y0 + 14, K.white);
  } else if (st <= 3 && c.r.chance(0.55)) { // punk xerox
    p.rect(x0, y0, w, hh, K.white);
    for (let y = y0 + 4; y < y0 + 16; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) { const v = noise(x >> 1, y >> 1, h28(c.seed)) * 0.5 + 0.9 - Math.hypot(x - 12, (y - 10) * 1.2) / 8; if (v > 0.72) p.put(x, y, K.ink); }
    const t = 'GIG'; let x = x0 + 2; for (const ch of t) { p.rect(x - 1, y0 + 17, 5, 7 - 1, ch === 'I' ? K.ink : hsl(c.hue, 85, 55)); drawText(p, ch, x, y0 + 18, ch === 'I' ? K.white : K.ink); x += 5; }
  } else if (st === 3) { // neon
    for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + w; x++) p.put(x, y, dith(x, y, (y - y0) / hh) ? C('#7a1a6a') : C('#1a0e3a'));
    p.disc(12, 10, 5, K.yellow); for (let y = 11; y < 16; y += 2) p.hline(7, 17, y, C('#1a0e3a'));
    for (let k = 0; k < 4; k++) p.hline(x0, x0 + w - 1, y0 + 16 + k * 2, C('#ff3fd0'));
  } else { // minimal / digital
    const bg = hsl(c.hue, 45, st === 5 ? 18 : 62); p.rect(x0, y0, w, hh, bg);
    p.disc(12, 9, 5.5, hsl(c.hue + 180, 70, st === 5 ? 60 : 40));
    for (let y = y0 + 16; y < y0 + 21; y += 2) p.hline(x0 + 2, x0 + 2 + c.r.int(6, 12), y, shade(bg, -0.5));
  }
  p.disc(x0 + 1.5, y0 + 1.5, 1.2, K.red); p.disc(x0 + w - 1.5, y0 + 1.5, 1.2, K.red);
}

function carDraw(p: Px, c: Ctx): void {
  const n = c.name.toLowerCase();
  const psych = /rolls|porsche|psicod|psyched/.test(n) || (c.b === 2 && c.r.chance(0.35));
  const gold = /gold|dourad|cadillac/.test(n);
  const base = gold ? K.gold : psych ? C('#f0d040') : c.b === 0 ? pick(c.r, [C('#2a2628'), C('#6a1a20')]) : c.b === 1 ? pick(c.r, [C('#f0a0b8'), C('#8ad0c0'), C('#e8e0d0')]) : c.b === 3 ? C('#1e1a1c') : pick(c.r, [hsl(c.hue, 55, 45), C('#d0d4dc'), C('#2a2628')]);
  const col = (x: number, y: number): Col => psych ? (noise(x >> 1, y >> 1, 21) < 0.22 ? hsl(c.hue + x * 25, 80, 55) : base) : base;
  const sporty = /porsche/.test(n);
  if (c.b === 0) {
    p.poly([[1, 18], [2, 13], [6, 12], [8, 7], [16, 7], [18, 12], [22, 13], [23, 18]], col);
    p.ellipse(6, 16, 4, 3, shade(base, -0.2)); p.ellipse(18, 16, 4, 3, shade(base, -0.2)); p.hline(9, 15, 18, K.silver);
  } else if (c.b === 1 || gold) {
    p.poly([[0, 18], [0, 13], [6, 12], [8, 8], [15, 8], [18, 12], [22, 11], [24, 9], [23, 18]], col); p.hline(1, 22, 15, K.silver);
  } else if (sporty) {
    p.poly([[2, 18], [3, 14], [8, 9], [15, 9], [21, 14], [22, 18]], col);
  } else if (c.b === 3) {
    p.poly([[0, 18], [0, 14], [4, 13], [6, 10], [19, 10], [21, 13], [24, 14], [24, 18]], col); p.hline(1, 22, 16, K.silver);
  } else {
    p.poly([[1, 18], [1, 12], [5, 8], [18, 8], [22, 12], [23, 18]], col);
  }
  for (let x = 8; x < 16; x += 4) p.rect(x, sporty ? 10 : 9, 3, 2, C('#2a3a50'));
  p.disc(6, 18.5, 2.6, K.ink); p.disc(18, 18.5, 2.6, K.ink); p.disc(6, 18.5, 1, K.silver); p.disc(18, 18.5, 1, K.silver);
  p.put(22, 14, K.yellow); p.put(1, 15, K.red);
}

// ---------------------------------------------------------------- API

/** Pinta a relíquia (24×24, com contorno). Puro: mesma (tipo, semente, ano, nome) → mesmos pixels. */
export function relicPx28(art: RelicArt28, seed: string, year: number, name = ''): Px {
  const p = new Px(N, N);
  const r = rng28('relic', art, seed);
  const c: Ctx = { r, y: year, b: relicBand28(year), hue: h28('hue', seed) % 360, name, seed };
  (DRAW[art] ?? DRAW.prop)(p, c);
  p.outline(OUT28);
  return p;
}

/** <img> da relíquia (memorizado). `size` em px de tela (múltiplos de 24 ficam mais nítidos). */
export function relicImg28(kind: string, name: string, year: number, seed: string, size = 48, title?: string): HTMLImageElement {
  const art = relicArtOf28(kind, name, year, seed);
  const a29 = relicArtOf29(kind, name, year, seed, art); // r29: mais relíquias (banjo, sanfona, boombox, credencial…)
  if (a29) return pxImg28(`rl29:${a29}:${seed}:${relicBand28(year)}:${name.length}`, () => relicPx29(a29, seed, year, name), size, size, { cls: 'relic28', title });
  return pxImg28(`rl:${art}:${seed}:${relicBand28(year)}:${name.length}`, () => relicPx28(art, seed, year, name), size, size, { cls: 'relic28', title });
}

/** <img> de um instrumento pelo papel do músico (museu). */
export function roleImg28(role: string, year: number, seed: string, size = 24, title?: string): HTMLImageElement {
  const art = relicArtOfRole28(role, year);
  return pxImg28(`ro:${art}:${seed}:${relicBand28(year)}`, () => relicPx28(art, seed, year), size, size, { cls: 'relic28', title });
}
