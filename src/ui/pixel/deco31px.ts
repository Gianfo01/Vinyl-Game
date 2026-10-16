// R31 · DECO-A — ARTE da decoração (casa, sede e estabelecimentos) e dos UPGRADES dos itens obrigatórios.
//
// Mesmo padrão aprovado de exp5px/props31: corte lateral, luz de cima à esquerda, pé em sombra, contorno escuro
// quente (INK) de 1 px na silhueta, escala dos bonecos (avatarSprite 24×34: o sofá bate no joelho, o abajur de pé
// passa da cabeça, o vaso cabe na mesa). Nada flutua: quadro tem prego e barbante, lustre tem fio até o teto (y = 0),
// móvel de chão pisa na última linha, objeto de mesa tem base na última linha.
//
// Oito ESTILOS de época (deco.md): art nouveau, art déco, anos 50, anos 70, anos 80, anos 90, minimalista e casa
// inteligente. Cada item existe num conjunto de estilos e tem desenho próprio em cada um; estado "novo" ou "usado"
// (vintage: desbotado, riscado, manchado); luzes acendem. Papéis de parede e pisos são LADRILHOS que se repetem sem
// costura (função periódica de x, y). Letreiros e placas aceitam o nome do selo.
//
//   styOf(ano)                         — PURO: estilo da época de um ano;
//   decoPx(id, estilo, op)             — PURO (só Px): o item com margem DPAD; tamanho fixo por item;
//   decoTilePx / decoFillPx            — PURO: ladrilho e área preenchida dos padrões (papel, pintura, piso);
//   upgPx(id, ano, nível, op)          — PURO: item obrigatório no nível de upgrade (1..n), na época do ano;
//   decoArtId(idDoCatálogo)            — ponte entre os ids do catálogo da DECO-M e os desenhos daqui.
// Tudo determinístico (sem sorteio): mesma entrada, mesmos pixels. Nada vai para o save. Só aparência.

import { C, INK, Px, lv, mix, noise, rgba, pack, withAlpha, type Col } from './px';
import { abbrText, drawText, textWidth } from './font';
import { ep5Of } from './exp5px';

// ---------------------------------------------------------------- estilos de época

export const DSTY = ['nouveau', 'deco', 's50', 's70', 's80', 's90', 'mini', 'smart'] as const;
export type DSty = (typeof DSTY)[number];
export const DSTY_LABEL: Record<DSty, { pt: string; en: string; years: string }> = {
  nouveau: { pt: 'Art nouveau', en: 'Art nouveau', years: '1889–1919' },
  deco: { pt: 'Art déco', en: 'Art deco', years: '1920–1944' },
  s50: { pt: 'Anos 50', en: '1950s', years: '1945–1964' },
  s70: { pt: 'Anos 70', en: '1970s', years: '1965–1981' },
  s80: { pt: 'Anos 80', en: '1980s', years: '1982–1991' },
  s90: { pt: 'Anos 90', en: '1990s', years: '1992–2003' },
  mini: { pt: 'Minimalista', en: 'Minimalist', years: '2004–2014' },
  smart: { pt: 'Casa inteligente', en: 'Smart home', years: '2015–2040' },
};
/** Ano típico de cada estilo (galeria e testes). */
export const DSTY_YEAR: Record<DSty, number> = { nouveau: 1905, deco: 1932, s50: 1956, s70: 1974, s80: 1986, s90: 1997, mini: 2009, smart: 2025 };
/** Estilo (índice 0..7) da época de um ano. */
export function styOf(year: number): number {
  return year < 1920 ? 0 : year < 1945 ? 1 : year < 1965 ? 2 : year < 1982 ? 3 : year < 1992 ? 4 : year < 2004 ? 5 : year < 2015 ? 6 : 7;
}
const styIx = (s: DSty | number): number => (typeof s === 'number' ? s : DSTY.indexOf(s));

/** Materiais de cada estilo: madeira, tecido, metal e acentos (cada cor vira rampa com lv). */
interface Mat { wood: Col; wood2: Col; fab: Col; fab2: Col; metal: Col; acc: Col; acc2: Col; glass: Col; wall: Col; floor: Col }
const M: Mat[] = [
  { wood: C('#6a3a22'), wood2: C('#4a2416'), fab: C('#8a2a3a'), fab2: C('#c8a060'), metal: C('#c09048'), acc: C('#5a8a5a'), acc2: C('#d8b878'), glass: C('#a8c8b8'), wall: C('#b8a888'), floor: C('#6a4a30') },
  { wood: C('#2e2024'), wood2: C('#1a1418'), fab: C('#e6dac0'), fab2: C('#20202a'), metal: C('#e0b048'), acc: C('#2a7a7a'), acc2: C('#c8584a'), glass: C('#c8d8e0'), wall: C('#d8c8a0'), floor: C('#3a2a2a') },
  { wood: C('#c48a52'), wood2: C('#8a5a30'), fab: C('#48a8a0'), fab2: C('#f0a0a8'), metal: C('#c0c4cc'), acc: C('#e04848'), acc2: C('#f0d040'), glass: C('#a8e0f0'), wall: C('#e8e0c0'), floor: C('#a8a088') },
  { wood: C('#7a4a24'), wood2: C('#4a2c18'), fab: C('#d8782a'), fab2: C('#a8862a'), metal: C('#c0a060'), acc: C('#7a8a2a'), acc2: C('#a8401a'), glass: C('#c8b070'), wall: C('#c8a868'), floor: C('#8a5a2a') },
  { wood: C('#ece6dc'), wood2: C('#24242a'), fab: C('#e04898'), fab2: C('#3ac0d0'), metal: C('#26262c'), acc: C('#f0e040'), acc2: C('#6a4ad0'), glass: C('#b8a8f0'), wall: C('#d8d0e0'), floor: C('#5a5a6a') },
  { wood: C('#c8a070'), wood2: C('#8a6a44'), fab: C('#4a6a8a'), fab2: C('#8a3a2a'), metal: C('#8a8c94'), acc: C('#d8a030'), acc2: C('#3a6a3a'), glass: C('#b8d0c8'), wall: C('#d8d0b8'), floor: C('#9a7a50') },
  { wood: C('#e2cfaa'), wood2: C('#b89a70'), fab: C('#c4c4c0'), fab2: C('#f2f0ea'), metal: C('#2a2a2e'), acc: C('#6a7a6a'), acc2: C('#c8784a'), glass: C('#d8e4e8'), wall: C('#ecebe6'), floor: C('#c8c0b0') },
  { wood: C('#9a7250'), wood2: C('#6a4a34'), fab: C('#4c4e56'), fab2: C('#8a8c96'), metal: C('#d8dce4'), acc: C('#5ae0ff'), acc2: C('#2a2c34'), glass: C('#30404c'), wall: C('#d0d4d8'), floor: C('#7a7a80') },
];
export const decoWall = (s: DSty | number): Col => M[styIx(s)].wall;
export const decoFloor = (s: DSty | number): Col => M[styIx(s)].floor;

// ---------------------------------------------------------------- catálogo da arte (ids provisórios até o catálogo da DECO-M)

export type DSlot = 'wall' | 'floor' | 'desk' | 'ceil' | 'paper' | 'floorcover' | 'window' | 'sign';
export type DFam =
  | 'quadro' | 'relogio' | 'espelho' | 'prateleira' | 'sofa' | 'poltrona' | 'estante' | 'jukebox' | 'aquario' | 'planta'
  | 'luz' | 'mesa' | 'som' | 'escultura' | 'bar' | 'piano' | 'objeto' | 'papel' | 'piso' | 'tapete' | 'cortina' | 'letreiro';
export interface DecoArt {
  id: string; fam: DFam; slot: DSlot; w: number; h: number;
  /** estilos (índices de DSTY) em que o item existe */
  sty: number[];
  /** tem luz própria (abajur, lustre, jukebox, aquário, neon): estado aceso */
  light?: boolean;
  /** escreve o nome do selo */
  label?: boolean;
  /** padrão que se repete (w × h = ladrilho) */
  tile?: boolean;
  pt: string; en: string;
}
const ALL = [0, 1, 2, 3, 4, 5, 6, 7];
const A = (id: string, fam: DFam, slot: DSlot, w: number, h: number, pt: string, en: string, o: Partial<DecoArt> = {}): DecoArt => ({ id, fam, slot, w, h, sty: ALL, pt, en, ...o });
export const DECO_ART: DecoArt[] = [
  // parede
  A('poster', 'quadro', 'wall', 18, 24, 'Pôster de show', 'Gig poster'),
  A('painting', 'quadro', 'wall', 28, 20, 'Quadro', 'Painting'),
  A('goldrec', 'quadro', 'wall', 16, 20, 'Disco emoldurado', 'Framed record'),
  A('clock', 'relogio', 'wall', 14, 16, 'Relógio de parede', 'Wall clock'),
  A('wallmirror', 'espelho', 'wall', 16, 22, 'Espelho decorativo', 'Decorative mirror'),
  A('wallshelf', 'prateleira', 'wall', 28, 14, 'Prateleira com enfeites', 'Shelf with ornaments'),
  // chão
  A('sofa', 'sofa', 'floor', 46, 22, 'Sofá', 'Sofa'),
  A('armchair', 'poltrona', 'floor', 22, 26, 'Poltrona', 'Armchair'),
  A('bookcase', 'estante', 'floor', 26, 40, 'Estante', 'Bookcase'),
  A('jukebox', 'jukebox', 'floor', 22, 34, 'Jukebox', 'Jukebox', { sty: [1, 2, 3, 4, 5, 6, 7], light: true }),
  A('aquarium', 'aquario', 'floor', 30, 30, 'Aquário', 'Aquarium', { light: true }),
  A('bigplant', 'planta', 'floor', 16, 32, 'Planta grande', 'Big plant'),
  A('floorlamp', 'luz', 'floor', 12, 40, 'Abajur de pé', 'Floor lamp', { light: true }),
  A('coffeetable', 'mesa', 'floor', 28, 12, 'Mesa de centro', 'Coffee table'),
  A('stereo', 'som', 'floor', 30, 24, 'Aparelho de som', 'Stereo'),
  A('sculpture', 'escultura', 'floor', 14, 32, 'Escultura no pedestal', 'Sculpture on a plinth'),
  A('barcart', 'bar', 'floor', 22, 22, 'Bar / carrinho de bebidas', 'Drinks cart'),
  A('piano', 'piano', 'floor', 34, 30, 'Piano', 'Piano'),
  A('rug', 'tapete', 'floorcover', 44, 8, 'Tapete', 'Rug'),
  // sobre a mesa
  A('tablelamp', 'luz', 'desk', 10, 16, 'Abajur de mesa', 'Table lamp', { light: true }),
  A('smallplant', 'planta', 'desk', 10, 12, 'Vasinho', 'Small plant'),
  A('vase', 'objeto', 'desk', 8, 14, 'Vaso de flores', 'Flower vase'),
  A('globe', 'objeto', 'desk', 10, 14, 'Globo de mesa', 'Desk globe'),
  // teto
  A('chandelier', 'luz', 'ceil', 24, 20, 'Lustre / pendente', 'Chandelier / pendant', { light: true }),
  A('ceilfan', 'luz', 'ceil', 30, 12, 'Ventilador de teto', 'Ceiling fan'),
  // padrões
  A('wallpaper', 'papel', 'paper', 16, 16, 'Papel de parede', 'Wallpaper', { tile: true }),
  A('paint', 'papel', 'paper', 16, 16, 'Pintura e textura', 'Paint and texture', { tile: true }),
  A('floor', 'piso', 'floorcover', 16, 8, 'Piso', 'Floor', { tile: true }),
  // janela (o miolo fica vazio: a vista da cidade continua)
  A('curtain', 'cortina', 'window', 36, 40, 'Cortina', 'Curtains'),
  A('winframe', 'cortina', 'window', 36, 40, 'Moldura da janela', 'Window frame'),
  // fachada e placas (escrevem o nome do selo)
  A('sign', 'letreiro', 'sign', 64, 18, 'Letreiro da fachada', 'Front sign', { label: true, light: true }),
  A('logo', 'letreiro', 'wall', 40, 22, 'Placa com o logo', 'Logo plaque', { label: true }),
];
export const DECO_ART_IDS = DECO_ART.map((d) => d.id);
const BY_ID = new Map(DECO_ART.map((d) => [d.id, d]));
export const decoArt = (id: string): DecoArt | undefined => BY_ID.get(id);
/** Vão da janela dentro de cortina/moldura (transparente: a vista da cidade aparece por trás). */
export const DWIN = { x: 6, y: 6, w: 24, h: 30 } as const;

/**
 * Ponte com o catálogo da DECO-M (`src/data/deco31.ts`): id do catálogo → desenho daqui. Aceita o id igual, um alias
 * desta tabela, ou o padrão `<família>-<qualquer coisa>` com a família igual a um id daqui (ex.: 'sofa-chesterfield').
 */
export const DECO_ALIAS: Record<string, string> = {
  quadro: 'painting', pintura: 'painting', poster: 'poster', cartaz: 'poster', disco: 'goldrec', discoouro: 'goldrec', relogio: 'clock',
  espelho: 'wallmirror', prateleira: 'wallshelf', poltrona: 'armchair', estante: 'bookcase', aquario: 'aquarium', planta: 'bigplant',
  vaso: 'vase', vasinho: 'smallplant', abajur: 'tablelamp', luminaria: 'floorlamp', lustre: 'chandelier', pendente: 'chandelier',
  ventilador: 'ceilfan', mesacentro: 'coffeetable', som: 'stereo', vitrola: 'stereo', escultura: 'sculpture', bar: 'barcart',
  tapete: 'rug', papel: 'wallpaper', papelparede: 'wallpaper', pintura_parede: 'paint', piso: 'floor', cortina: 'curtain',
  moldura: 'winframe', letreiro: 'sign', logo: 'logo', placa: 'logo', globo: 'globe',
};
export function decoArtId(catId: string): string | undefined {
  if (BY_ID.has(catId)) return catId;
  const a = DECO_ALIAS[catId];
  if (a) return a;
  const head = catId.split(/[-_:.]/)[0];
  return BY_ID.has(head) ? head : DECO_ALIAS[head];
}

// ---------------------------------------------------------------- peças comuns

interface Dc { p: Px; fx: Px; s: number; m: Mat; lit: boolean; w: number; h: number; name: string }

const W = C('#f8f4ec'), PAPER = C('#efe6cc'), RED = C('#c83a32'), GOLD = C('#e0b048'), BRASS = C('#c09048'), CHROME = C('#b8bcc8');
const BLACK = C('#1e1c22'), GREY = C('#8a8c94'), DGREY = C('#4a4c56'), GLOW = C('#ffe08a'), LEAF = C('#3c8a3c'), LEAF2 = C('#5cb04c');
const BULB = C('#fff4c0');

/** Bloco com luz de cima à esquerda e pé em sombra (mesma conta de exp5px). */
const blk = (p: Px, x: number, y: number, w: number, h: number, c: Col): void => {
  if (w <= 0 || h <= 0) return;
  p.rect(x, y, w, h, c);
  p.hline(x, x + w - 1, y, lv(c, 4));
  if (h > 3 && w > 3) p.vline(x, y + 1, y + h - 2, lv(c, 3.5));
  p.hline(x, x + w - 1, y + h - 1, lv(c, 1));
  if (h > 2) p.vline(x + w - 1, y + 1, y + h - 2, lv(c, 2));
};
/** Moldura de espessura t com o miolo em outra cor. */
const framed = (p: Px, x: number, y: number, w: number, h: number, t: number, fr: Col, inner: Col): void => {
  blk(p, x, y, w, h, fr);
  p.rect(x + t, y + t, w - 2 * t, h - 2 * t, inner);
  p.hline(x + t, x + w - t - 1, y + t, lv(inner, 2));
};
/** Prego e barbante: o quadro não flutua. */
const hang = (p: Px, cx: number, x0: number, x1: number, yb: number): void => {
  const s = C('#4a3a30');
  p.line(cx, 0, x0, yb, s); p.line(cx, 0, x1, yb, s);
  p.put(cx, 0, C('#8a8a92'));
};
/** Bola sombreada (luz de cima à esquerda). */
const ball = (p: Px, cx: number, cy: number, r: number, c: Col): void => {
  p.disc(cx, cy, r, (x, y) => { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; return dx + dy < -r * 0.5 ? lv(c, 4.4) : dx + dy > r * 0.6 ? lv(c, 1.6) : c; });
};
/** Brilho de luz (vai para a camada fx: luz não ganha contorno). */
const glow = (d: Dc, cx: number, cy: number, r: number, c: Col = GLOW): void => {
  if (!d.lit) return;
  d.fx.disc(cx, cy, r, (_x, _y, dd) => withAlpha(c, Math.round(110 * (1 - dd / (r + 0.5)))));
};
/** Pés do móvel no estilo da época, de `top` até o chão (última linha). Retorna nada; desenha em x0 e x1 (bordas). */
function legs(d: Dc, x0: number, x1: number, top: number): void {
  const { p, s, m, h } = d, fl = h - 1;
  if (s === 0) { // cabriolé curvo com pezinho
    for (const [x, dir] of [[x0, -1], [x1, 1]] as const) { p.line(x, top, x + dir, top + ((fl - top) >> 1), m.wood2); p.line(x + dir, top + ((fl - top) >> 1), x, fl - 1, m.wood2); p.put(x, fl, m.metal); p.put(x + dir, fl, lv(m.wood2, 1)); }
  } else if (s === 1) { // rodapé escalonado preto com filete dourado
    blk(p, x0, top, x1 - x0 + 1, fl - top + 1, m.wood2); p.hline(x0 + 1, x1 - 1, top + 1, m.metal);
  } else if (s === 2) { // pés palito abertos com ponteira
    p.line(x0 + 2, top, x0, fl, m.wood2); p.line(x1 - 2, top, x1, fl, m.wood2); p.put(x0, fl, m.metal); p.put(x1, fl, m.metal);
  } else if (s === 3) { // base baixa e recuada
    p.rect(x0 + 2, top, x1 - x0 - 3, fl - top + 1, lv(m.wood2, 1.4));
  } else if (s === 4) { // pés geométricos coloridos: cilindro e cone
    blk(p, x0, top, 3, fl - top + 1, m.acc); p.poly([[x1 - 3, fl + 1], [x1 + 1, fl + 1], [x1 - 1, top]], m.acc2);
  } else if (s === 5) { // pés retos de madeira
    blk(p, x0, top, 2, fl - top + 1, m.wood2); blk(p, x1 - 1, top, 2, fl - top + 1, m.wood2);
  } else if (s === 6) { // grampo de aço fino
    p.line(x0 + 1, top, x0, fl, m.metal); p.line(x0 + 1, top, x0 + 3, fl, m.metal); p.line(x1 - 1, top, x1, fl, m.metal); p.line(x1 - 1, top, x1 - 3, fl, m.metal);
  } else { // base recuada escura com fita de LED no chão
    p.rect(x0 + 3, top, x1 - x0 - 5, fl - top + 1, C('#1e1e24'));
    p.hline(x0 + 3, x1 - 3, fl, d.lit ? lv(m.acc, 5) : lv(m.acc, 2));
    if (d.lit) d.fx.hline(x0 + 1, x1 - 1, fl, withAlpha(m.acc, 120));
  }
}
/** Livros numa fileira (altura e cor variando, determinístico). */
function books(p: Px, x: number, yb: number, w: number, hmax: number, seed: number, cols: Col[]): void {
  let xx = x;
  let i = 0;
  while (xx < x + w) {
    const bw = 1 + (noise(i, seed, 3) > 0.6 ? 1 : 0);
    const bh = hmax - Math.floor(noise(i, seed, 5) * 3);
    if (xx + bw > x + w) break;
    const c = cols[Math.floor(noise(i, seed, 9) * cols.length)];
    p.rect(xx, yb - bh + 1, bw, bh, c); p.put(xx, yb - bh + 1, lv(c, 4.4));
    xx += bw + (noise(i, seed, 11) > 0.85 ? 1 : 0);
    i++;
  }
}
/** Folhagem: tufo de folhas em volta de (cx, cy). */
function foliage(p: Px, cx: number, cy: number, rx: number, ry: number, seed: number, a: Col = LEAF, b: Col = LEAF2): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const k = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
    if (k > 1 - noise(x, y, seed) * 0.45) continue;
    const hi = x + y < cx + cy - 1 && noise(x, y, seed + 1) > 0.35;
    p.set(x, y, hi ? b : noise(x, y, seed + 2) > 0.8 ? lv(a, 1.6) : a);
  }
}

// ---------------------------------------------------------------- parede

/** Pôster: litografia nouveau → raios déco → jazz anos 50 → psicodelia → grade neon → fotocópia grunge → suíço → moldura digital. */
function poster(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const y0 = s <= 1 ? 3 : 1, ph = h - y0;
  if (s <= 1) hang(p, w >> 1, 3, w - 4, y0);
  if (s === 0) {
    framed(p, 0, y0, w, ph, 1, m.wood2, PAPER);
    p.rect(2, y0 + 2, w - 4, ph - 4, C('#e8d8b0'));
    p.disc(w / 2, y0 + 9, 5, C('#d8b060')); p.disc(w / 2, y0 + 9, 3.6, C('#e8d8b0')); // auréola
    p.rect(w / 2 - 2, y0 + 7, 3, 4, C('#f0c8a0')); p.line(w / 2 - 3, y0 + 6, w / 2 - 5, y0 + 15, C('#a84a2a')); p.line(w / 2 + 1, y0 + 6, w / 2 + 4, y0 + 16, C('#a84a2a'));
    p.poly([[w / 2 - 4, y0 + 11], [w / 2 + 3, y0 + 11], [w / 2 + 5, y0 + 18], [w / 2 - 6, y0 + 18]], m.acc);
    for (let x = 3; x < w - 3; x++) p.put(x, y0 + 4 + Math.round(Math.sin(x * 0.9)), m.acc);
    p.rect(3, h - 4, w - 6, 2, m.fab);
  } else if (s === 1) {
    framed(p, 0, y0, w, ph, 1, m.metal, BLACK);
    for (let i = 0; i < 7; i++) p.line(w >> 1, h - 3, 2 + i * ((w - 5) / 6), y0 + 3, i % 2 ? m.metal : lv(m.metal, 2));
    p.rect(2, h - 6, w - 4, 3, m.acc); p.hline(3, w - 4, h - 5, m.fab);
    p.rect((w >> 1) - 3, y0 + 2, 6, 2, m.fab); p.rect((w >> 1) - 2, y0 + 1, 4, 1, m.fab);
  } else if (s === 2) {
    blk(p, 0, y0, w, ph, C('#f0d040'));
    p.disc(w / 2 + 2, y0 + 9, 5.5, RED); p.disc(w / 2 + 2, y0 + 9, 2.5, C('#f0d040'));
    p.line(2, h - 4, w - 6, y0 + 4, BLACK); p.line(3, h - 4, w - 5, y0 + 4, BLACK); // saxofone estilizado
    p.rect(2, h - 5, w - 4, 3, BLACK); p.hline(3, w - 6, h - 4, W);
    p.put(3, y0 + 2, W); p.put(w - 4, y0 + 15, W);
  } else if (s === 3) {
    const rings = [C('#a8401a'), C('#d8782a'), C('#f0b040'), C('#a8862a'), C('#7a8a2a'), C('#4a2c18')];
    p.rect(0, y0, w, ph, C('#f0e0b0'));
    for (let y = 0; y < ph; y++) for (let x = 0; x < w; x++) {
      const r = Math.hypot(x - w / 2 + 0.5, (y - ph + 2) * 1.1) + Math.sin(y * 0.7) * 1.2;
      p.set(x, y0 + y, rings[Math.floor(r / 2.4) % rings.length]);
    }
    p.rect(2, y0 + 2, w - 4, 3, C('#f0e0b0')); p.hline(3, w - 5, y0 + 3, C('#7a2a5a'));
  } else if (s === 4) {
    for (let y = 0; y < ph; y++) p.hline(0, w - 1, y0 + y, mix(C('#2a1a5a'), C('#e04898'), y / ph));
    p.disc(w / 2, y0 + 10, 5, C('#f0c040')); for (let k = 0; k < 3; k++) p.hline(w / 2 - 5, w / 2 + 5, y0 + 10 + k * 2, mix(C('#2a1a5a'), C('#e04898'), 0.45));
    for (let x = 0; x < w; x += 3) p.line(w / 2, y0 + 15, x, h - 1, C('#3ac0d0'));
    p.hline(0, w - 1, y0 + 15, C('#3ac0d0')); p.hline(0, w - 1, y0 + 18, C('#3ac0d0')); p.hline(0, w - 1, h - 2, C('#3ac0d0'));
  } else if (s === 5) {
    p.rect(0, y0, w, ph, C('#d0ccc4'));
    for (let y = 0; y < ph; y++) for (let x = 0; x < w; x++) if (noise(x, y, 51) > 0.86) p.set(x, y0 + y, C('#3a3a3a'));
    p.rect(3, y0 + 5, w - 6, 9, C('#2a2a2a')); p.rect(5, y0 + 7, 4, 5, C('#8a8a8a')); p.rect(10, y0 + 6, 4, 6, C('#6a6a6a'));
    p.rect(2, h - 6, w - 4, 3, RED); p.hline(3, w - 5, h - 5, W);
    p.poly([[w - 5, y0], [w, y0], [w, y0 + 4]], 0); // canto rasgado
    for (let y = 0; y < 4; y++) for (let x = w - 4 + y; x < w; x++) p.put(x, y0 + y, 0);
  } else if (s === 6) {
    p.rect(0, y0, w, ph, W); p.hline(0, w - 1, y0, lv(W, 4));
    p.disc(w / 2 - 1, y0 + 9, 5, BLACK); p.disc(w / 2 + 2, y0 + 7, 1.6, m.acc2);
    p.hline(2, 9, h - 6, BLACK); p.hline(2, 13, h - 4, GREY); p.hline(2, 6, h - 3, GREY);
  } else {
    blk(p, 0, y0, w, ph, C('#1a1a1e'));
    const sx = 1, sy = y0 + 1, sw = w - 2, sh = ph - 4;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const t = (x + y) / (sw + sh);
      p.set(sx + x, sy + y, lv(mix(C('#3a2a8a'), C('#e85a8a'), t), lit ? 4 : 2.6));
    }
    p.disc(w / 2, sy + sh / 2, 4, lit ? C('#1a1a2a') : C('#121218')); p.disc(w / 2, sy + sh / 2, 1.2, lit ? C('#f0c040') : C('#6a5a2a'));
    p.put(w - 3, h - 2, lit ? m.acc : DGREY); glow(d, w / 2, sy + sh / 2, 9, C('#e85a8a'));
  }
  if (s >= 2 && s <= 5) { const t = C('#e8e0c8', 220); p.rect(0, y0, 2, 2, t); p.rect(w - 2, y0, 2, 2, t); } // fita/tachinha
}

/** Quadro: paisagem em moldura dourada → figura déco → abstrato anos 50 → op-art → Memphis → pop art → campo de cor → tela digital. */
function painting(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const y0 = 3;
  hang(p, w >> 1, 4, w - 5, y0);
  const fr = [C('#d8a840'), BLACK, m.wood, m.wood, W, m.wood, C('#e8e6e0'), C('#1a1a1e')][s];
  const t = s === 0 ? 3 : s === 3 || s === 6 ? 0 : 1;
  const ix = t, iy = y0 + t, iw = w - 2 * t, ih = h - y0 - 2 * t;
  if (t) blk(p, 0, y0, w, h - y0, fr);
  if (s === 0) { for (let x = 0; x < w; x += 3) { p.put(x, y0, lv(fr, 5)); p.put(x + 1, h - 1, lv(fr, 1.4)); } }
  const at = (x: number, y: number, c: Col) => p.set(ix + x, iy + y, c);
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) {
    let c: Col;
    const u = x / iw, v = y / ih;
    if (s === 0) c = v < 0.55 ? mix(C('#c8d8e0'), C('#f0e0c0'), v * 1.6) : v < 0.55 + 0.25 * Math.sin(u * 3) ? C('#6a8a4a') : C('#4a6a3a');
    else if (s === 1) c = (u - 0.5) ** 2 + (v - 0.45) ** 2 < 0.06 ? C('#e8c8a8') : u + v > 1.1 ? m.acc : C('#e6dac0');
    else if (s === 2) c = C('#ece4cc');
    else if (s === 3) c = Math.floor(Math.hypot(x - iw / 2, (y - ih / 2) * 1.4) / 2) % 2 ? C('#d8782a') : C('#f0e0b0');
    else if (s === 4) c = C('#f0a0c8');
    else if (s === 5) c = (x + (y % 2) * 1) % 2 === 0 && y % 2 === 0 ? C('#e04848') : C('#f8e8d0');
    else if (s === 6) c = v < 0.45 ? C('#b8584a') : v < 0.5 ? C('#e8d8c0') : C('#4a3a50');
    else c = lv(mix(C('#1a3a5a'), C('#5ae0ff'), (Math.sin(u * 6) + 1) / 4 + v / 2), lit ? 3.6 : 2.4);
    at(x, y, c);
  }
  if (s === 0) { p.vline(ix + 18, iy + 6, iy + ih - 3, C('#4a2a1a')); foliage(p, ix + 18, iy + 5, 3, 3, 3); p.disc(ix + 5, iy + 3, 1.2, C('#fff0b0')); }
  if (s === 1) { p.poly([[ix + iw / 2 - 2, iy + 9], [ix + iw / 2 + 2, iy + 9], [ix + iw / 2 + 4, iy + ih], [ix + iw / 2 - 4, iy + ih]], BLACK); p.rect(ix + iw / 2 - 3, iy + 2, 6, 2, BLACK); p.hline(ix + 1, ix + iw - 2, iy + 1, m.metal); }
  if (s === 2) { p.line(ix + 2, iy + 10, ix + 12, iy + 3, BLACK); p.line(ix + 12, iy + 3, ix + 20, iy + 12, BLACK); p.disc(ix + 6, iy + 6, 2.2, RED); p.disc(ix + 18, iy + 5, 1.8, C('#3a6ac8')); p.disc(ix + 14, iy + 11, 1.5, C('#f0d040')); p.put(ix + 9, iy + 12, BLACK); }
  if (s === 4) { for (let x = 0; x < iw; x++) p.set(ix + x, iy + 4 + Math.round(Math.sin(x * 0.8) * 1.5), BLACK); p.poly([[ix + 3, iy + ih - 1], [ix + 9, iy + ih - 1], [ix + 6, iy + 8]], C('#3ac0d0')); p.disc(ix + iw - 6, iy + ih - 5, 2.5, C('#f0e040')); p.rect(ix + 12, iy + 9, 4, 4, C('#6a4ad0')); }
  if (s === 5) { p.disc(ix + iw / 2, iy + ih / 2, 5, C('#f0d040')); p.rect(ix + iw / 2 - 2, iy + ih / 2 - 1, 1, 1, BLACK); p.rect(ix + iw / 2 + 1, iy + ih / 2 - 1, 1, 1, BLACK); p.hline(ix + iw / 2 - 2, ix + iw / 2 + 2, iy + ih / 2 + 2, BLACK); }
  if (s === 6) { p.hline(0, w - 1, y0, lv(C('#b8584a'), 4)); p.vline(w - 1, y0, h - 1, lv(C('#4a3a50'), 1)); }
  if (s === 3) p.vline(w - 1, y0, h - 1, C('#7a4a24'));
  if (s === 7) { p.put(w - 3, h - 2, lit ? m.acc : DGREY); glow(d, w / 2, h / 2 + 1, 12, C('#5ae0ff')); }
}

/** Disco emoldurado: 78 rpm sobre veludo → disco de prata → disco de ouro com plaqueta → ouro em nogueira → platina → CD multiplatina → vinil colorido flutuando → ouro com borda de LED. */
function goldrec(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const y0 = 3;
  hang(p, w >> 1, 3, w - 4, y0);
  const fr = [C('#d8a840'), BLACK, m.wood, C('#5a3418'), BLACK, C('#c8c8cc'), W, C('#2a2a30')][s];
  const mat = [m.fab, C('#e6dac0'), W, C('#e8d8b0'), C('#2a2a32'), C('#2a3a6a'), W, C('#14141a')][s];
  framed(p, 0, y0, w, h - y0, s === 6 ? 1 : 2, fr, mat);
  const disc = [BLACK, C('#c8ccd4'), GOLD, GOLD, C('#e8ecf4'), C('#d8dce8'), BLACK, GOLD][s];
  const cx = w / 2, cy = y0 + 7.5;
  if (s === 5) { // dois discos: CD e vinil
    p.disc(cx - 2, cy, 4, disc); p.disc(cx - 2, cy, 1, mat); p.disc(cx + 3, cy + 1, 3, C('#c8ccd8')); p.disc(cx + 3, cy + 1, 0.8, mat); p.line(cx + 1, cy - 1, cx + 4, cy + 2, C('#f0a0e0'));
  } else {
    p.disc(cx, cy, 5, disc);
    for (let r = 2; r < 5; r++) p.ring(cx, cy, r + 0.3, lv(disc, s === 0 || s === 6 ? 2.4 : 2));
    p.disc(cx, cy, 1.8, s === 6 ? m.acc2 : s === 0 ? RED : s === 3 ? C('#d8782a') : s === 4 ? C('#6a4ad0') : RED);
    p.put(cx - 2, cy - 3, lv(disc, 5));
  }
  if (s >= 2 && s !== 6) { p.rect(cx - 3, h - 5, 6, 2, s === 4 ? CHROME : GOLD); p.hline(cx - 2, cx + 1, h - 4, lv(GOLD, 1.6)); }
  if (s === 0) { p.rect(cx - 3, h - 5, 6, 2, PAPER); }
  if (s === 1) { p.hline(3, w - 4, h - 4, m.metal); }
  if (s === 6) p.hline(1, w - 2, h - 2, C('#d8d8d8'));
  if (s === 7) { p.hline(1, w - 2, y0 + 1, lit ? lv(m.acc, 5) : lv(m.acc, 2)); glow(d, cx, cy, 7, GOLD); }
}

/** Relógio de parede: de pêndulo → raios déco → atômico → laranja → quadrado neon → escritório → sem números → digital. */
function clock(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const hands = (cx: number, cy: number, r: number, c: Col) => { p.line(cx, cy, cx, cy - r + 1, c); p.line(cx, cy, cx + r - 2, cy + 1, c); };
  if (s === 0) { // caixa com pêndulo
    hang(p, w >> 1, 4, w - 5, 2);
    blk(p, 2, 2, w - 4, h - 2, m.wood); p.poly([[2, 3], [w / 2, 0], [w - 2, 3]], m.wood2);
    p.disc(w / 2, 6.5, 3.5, PAPER); hands(7, 6, 3, BLACK);
    p.rect(4, 11, w - 8, h - 13, lv(m.wood, 1)); p.vline(7, 11, h - 5, m.metal); p.disc(7, h - 4, 1.4, m.metal);
    return;
  }
  p.put(w >> 1, 0, GREY);
  const cx = w / 2, cy = h / 2 + 1;
  if (s === 1) {
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.line(cx, cy, cx + Math.cos(a) * 6.5, cy + Math.sin(a) * 6.5, i % 2 ? m.metal : lv(m.metal, 2)); }
    p.disc(cx, cy, 4, C('#e6dac0')); p.ring(cx, cy, 4.2, BLACK); hands(7, cy, 4, BLACK);
  } else if (s === 2) {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const x = cx + Math.cos(a) * 6, y = cy + Math.sin(a) * 6; p.line(cx, cy, x, y, m.wood2); ball(p, x, y, 1.2, i % 2 ? m.acc : m.acc2); }
    p.disc(cx, cy, 3, m.wood); hands(7, cy, 3, BLACK);
  } else if (s === 3) {
    p.disc(cx, cy, 6, m.fab); p.disc(cx, cy, 4.5, C('#f8ecd0')); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; p.put(cx + Math.cos(a) * 3.6 - 0.5, cy + Math.sin(a) * 3.6 - 0.5, m.wood2); } hands(7, cy, 4, m.wood2);
  } else if (s === 4) {
    blk(p, 1, 2, w - 2, w - 2, BLACK); p.rect(3, 4, w - 6, w - 6, C('#1a1a2a')); p.ring(cx, 2 + (w - 2) / 2, 4.5, lit ? C('#ff5ab0') : C('#a03a80'));
    hands(7, 2 + (w - 2) / 2, 4, C('#3ac0d0')); glow(d, cx, 2 + (w - 2) / 2, 7, C('#ff5ab0'));
  } else if (s === 5) {
    p.disc(cx, cy, 6, DGREY); p.disc(cx, cy, 5, W); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.put(cx + Math.cos(a) * 4.2 - 0.5, cy + Math.sin(a) * 4.2 - 0.5, BLACK); } hands(7, cy, 4, BLACK); p.line(7, cy, 4, cy + 3, RED);
  } else if (s === 6) {
    p.disc(cx, cy, 6, m.wood); p.disc(cx, cy, 5.2, C('#f2f0ea')); hands(7, cy, 5, BLACK); p.put(7, cy - 4.5, BLACK);
  } else {
    blk(p, 0, 4, w, 8, C('#1a1a1e')); drawText(p, '12', 1, 5.5, lit ? m.acc : lv(m.acc, 1.4)); p.put(8, 7, lit ? m.acc : lv(m.acc, 1.4)); drawText(p, '0', 10, 5.5, lit ? m.acc : lv(m.acc, 1.4));
    p.hline(1, w - 2, 12, C('#3a3a42')); p.vline(w >> 1, 0, 3, GREY); glow(d, cx, 8, 6, m.acc);
  }
}

/** Espelho decorativo de parede. */
function wallmirror(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const gl = lit ? mix(m.glass, GLOW, 0.4) : m.glass;
  const shine = (x: number, y: number, n: number) => p.line(x, y + n, x + n, y, lv(gl, 5));
  if (s === 0) { hang(p, w >> 1, 4, w - 5, 4); p.ellipse(w / 2, 13, 7.5, 9, m.wood); p.ellipse(w / 2, 13, 5.5, 7, gl); shine(5, 8, 3); p.poly([[3, 5], [w / 2, 1], [w - 3, 5], [w / 2, 4]], m.wood2); p.put(w / 2, 2, m.metal); }
  else if (s === 1) { hang(p, w >> 1, 3, w - 4, 3); p.poly([[3, 3], [w - 3, 3], [w - 1, 6], [w - 1, h - 1], [0, h - 1], [0, 6]], m.metal); p.rect(2, 6, w - 4, h - 8, gl); for (let i = 0; i < 3; i++) p.vline(4 + i * 4, 7, h - 4, lv(gl, 4)); }
  else if (s === 2) { p.put(w >> 1, 0, GREY); p.vline(w >> 1, 1, 3, C('#4a3a30')); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; p.line(w / 2, 12, w / 2 + Math.cos(a) * 7.5, 12 + Math.sin(a) * 8, i % 2 ? GOLD : lv(GOLD, 2)); } p.disc(w / 2, 12, 4, gl); shine(6, 10, 2); }
  else if (s === 3) { hang(p, w >> 1, 4, w - 5, 5); p.disc(w / 2, 13, 7.5, C('#c8a060')); for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; p.put(w / 2 + Math.cos(a) * 7 - 0.5, 13 + Math.sin(a) * 7 - 0.5, C('#8a6a30')); } p.disc(w / 2, 13, 5, gl); shine(5, 11, 3); p.vline(w / 2, h - 2, h - 1, m.fab); }
  else if (s === 4) { p.put(w >> 1, 0, GREY); p.vline(w >> 1, 1, 2, C('#4a3a30')); p.poly([[1, 3], [w - 1, 3], [w - 1, h - 1], [4, h - 1]], m.acc2); p.rect(3, 5, w - 6, h - 8, gl); p.rect(w - 5, h - 6, 4, 4, m.fab); p.disc(3, 5, 2, m.acc); shine(5, 8, 3); }
  else if (s === 5) { hang(p, w >> 1, 3, w - 4, 3); framed(p, 0, 3, w, h - 3, 2, m.wood, gl); shine(4, 7, 4); }
  else if (s === 6) { p.put(w >> 1, 0, GREY); p.vline(w >> 1, 1, 3, C('#4a3a30')); p.disc(w / 2, 13, 7.5, m.metal); p.disc(w / 2, 13, 6.8, gl); shine(4, 10, 4); }
  else { p.put(w >> 1, 0, GREY); blk(p, 0, 2, w, h - 2, C('#2a2a30')); p.rect(1, 3, w - 2, h - 4, mix(gl, C('#20303a'), 0.5)); drawText(p, '21', 2, 5, lit ? m.acc : lv(m.acc, 2)); p.disc(11.5, 6.5, 1.4, lit ? C('#f0c040') : DGREY); p.hline(2, 8, 12, lit ? lv(m.acc, 4) : DGREY); glow(d, w / 2, 8, 7, m.acc); }
}

/** Prateleira de parede com os enfeites da época. */
function wallshelf(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const sy = h - 4;
  const board = [m.wood, CHROME, m.wood, m.wood, m.acc, m.wood, W, m.wood][s];
  blk(p, 0, sy, w, 2, board);
  // suportes presos à parede
  if (s === 0) for (const x of [3, w - 5]) { p.line(x, sy + 2, x + 2, h - 1, m.wood2); p.put(x + 1, h - 1, m.wood2); p.put(x, sy + 3, m.wood2); }
  else if (s === 1) for (const x of [2, w - 4]) { p.rect(x, sy + 2, 2, 2, m.metal); p.rect(x, sy - 6, 2, 6, m.metal); }
  else if (s === 4) { p.poly([[2, sy + 2], [6, sy + 2], [2, h]], m.fab); p.poly([[w - 6, sy + 2], [w - 2, sy + 2], [w - 2, h]], m.fab2); }
  else if (s === 6 || s === 7) { p.rect(1, sy + 2, w - 2, 1, lv(board, 1)); if (s === 7) { p.hline(1, w - 2, sy + 2, lit ? lv(m.acc, 5) : lv(m.acc, 2)); if (lit) d.fx.rect(1, sy + 3, w - 2, 2, withAlpha(m.acc, 70)); } }
  else for (const x of [3, w - 5]) { p.rect(x, sy + 2, 2, h - sy - 2, s === 2 ? BRASS : GREY); p.hline(x, x + 1, h - 1, lv(GREY, 1)); }
  const yb = sy - 1;
  if (s === 0) { p.poly([[3, yb + 1], [8, yb + 1], [7, yb - 5], [4, yb - 5]], C('#4a7a6a')); p.rect(5, yb - 7, 1, 2, C('#4a7a6a')); p.rect(12, yb - 1, 3, 2, m.metal); p.vline(13, yb - 6, yb - 2, m.metal); p.put(13, yb - 7, W); books(p, 18, yb, 8, 7, 1, [m.fab, C('#3a5a3a'), C('#5a3a20')]); }
  else if (s === 1) { books(p, 4, yb, 8, 6, 2, [BLACK, C('#e6dac0'), m.acc]); p.poly([[15, yb], [20, yb - 5], [22, yb - 4], [18, yb]], m.metal); p.put(21, yb - 6, m.metal); p.rect(14, yb, 9, 1, BLACK); }
  else if (s === 2) { p.ellipse(6, yb - 2, 3, 2, C('#48a8a0')); p.put(9, yb - 3, C('#48a8a0')); p.put(3, yb - 3, BLACK); blk(p, 13, yb - 4, 3, 5, C('#c86a3a')); foliage(p, 14.5, yb - 6, 2, 2, 7); p.ellipse(22, yb - 2, 2.5, 2, C('#f0a0a8')); p.put(24, yb - 3, C('#f0a0a8')); }
  else if (s === 3) { blk(p, 2, yb - 3, 4, 4, C('#a8401a')); foliage(p, 4, yb - 6, 3, 3, 9, C('#5a7a2a'), C('#7a9a3a')); p.disc(12, yb - 3, 2.5, C('#8a6a3a')); p.put(11, yb - 4, W); p.put(13, yb - 4, W); p.put(12, yb - 2, C('#e0a040')); blk(p, 17, yb - 2, 7, 3, BLACK); p.rect(18, yb - 1, 5, 1, C('#e8d8b0')); }
  else if (s === 4) { blk(p, 3, yb - 4, 5, 5, C('#3ac0d0')); p.rect(4, yb - 3, 3, 3, lit ? C('#ff5ab0') : C('#a03a80')); glow(d, 5.5, yb - 1.5, 4, C('#ff5ab0')); for (let i = 0; i < 3; i++) blk(p, 11 + i * 4, yb - 6, 3, 7, BLACK); p.vline(12, yb - 5, yb - 1, W); p.disc(24, yb - 2, 2, C('#f0e040')); }
  else if (s === 5) { for (let i = 0; i < 6; i++) { p.rect(3 + i * 2, yb - 5, 1, 6, [C('#c8ccd8'), C('#3a6ac8'), C('#e04848'), C('#2a2a2a')][i % 4]); } blk(p, 16, yb - 4, 4, 5, C('#d8a030')); p.rect(17, yb - 6, 2, 2, C('#f0c8a0')); blk(p, 22, yb - 2, 4, 3, C('#3a6a3a')); }
  else if (s === 6) { p.poly([[5, yb + 1], [9, yb + 1], [8, yb - 6], [6, yb - 6]], C('#e8e4dc')); p.vline(7, yb - 9, yb - 7, LEAF); p.put(8, yb - 9, LEAF); blk(p, 15, yb - 1, 9, 2, m.acc); blk(p, 16, yb - 3, 7, 2, C('#e8d8b8')); }
  else { blk(p, 4, yb - 6, 5, 7, C('#3a3c44')); for (let y = yb - 5; y < yb; y += 2) p.hline(5, 7, y, C('#2a2a30')); p.hline(5, 7, yb - 6, lit ? m.acc : DGREY); glow(d, 6.5, yb - 6, 3, m.acc); blk(p, 13, yb - 2, 6, 3, W); p.put(15, yb - 1, lit ? m.acc : GREY); foliage(p, 23, yb - 3, 2.5, 3, 13); p.rect(21, yb - 1, 5, 2, C('#d8d0c0')); }
}

// ---------------------------------------------------------------- chão

/** Sofá: camelback capitonê → clube déco → palito anos 50 → modular de veludo cotelê → Memphis → estofadão com manta → linha baixa → modular com LED. */
function sofa(d: Dc): void {
  const { p, s, m, w, h } = d;
  const lh = [4, 3, 5, 2, 4, 3, 5, 2][s], fl = h - 1;
  const sb = fl - lh, sy = sb - 5; // assento: sy..sb
  const bh = [10, 9, 6, 8, 8, 9, 6, 7][s], by = sy - bh;
  const aw = [5, 7, 2, 6, 4, 6, 2, 5][s]; // largura do braço
  const back = s === 4 ? m.fab2 : m.fab, seat = m.fab, arm = s === 4 ? m.acc : s === 2 ? m.wood : m.fab;
  // encosto
  if (s === 0) { p.poly([[aw - 1, sy + 1], [aw - 1, by + 4], [w / 2 - 8, by], [w / 2 + 8, by], [w - aw + 1, by + 4], [w - aw + 1, sy + 1]], back); p.line(aw - 1, by + 4, w / 2 - 8, by, lv(back, 4)); p.hline(w / 2 - 8, w / 2 + 8, by, lv(back, 4)); p.line(w / 2 - 8, by - 1, w / 2 + 8, by - 1, m.wood2); }
  else if (s === 3) { for (let i = 0; i < 3; i++) { const x = aw + i * ((w - 2 * aw) / 3); p.ellipse(x + (w - 2 * aw) / 6, by + bh / 2 + 1, (w - 2 * aw) / 6, bh / 2 + 1, back); p.hline(x + 3, x + (w - 2 * aw) / 3 - 3, by + 1, lv(back, 4)); } }
  else blk(p, aw - 1, by, w - 2 * aw + 2, bh + 1, back);
  // detalhes do encosto
  if (s === 0) for (let y = by + 4; y < sy - 1; y += 3) for (let x = aw + 2 + ((y / 3) % 2) * 2; x < w - aw - 1; x += 4) p.put(x, y, lv(back, 1.4));
  if (s === 1) for (let x = aw + 2; x < w - aw - 1; x += 3) p.vline(x, by + 2, sy - 1, lv(back, 2.2));
  if (s === 2) for (let x = aw + 4; x < w - aw - 2; x += 7) p.put(x, by + 3, lv(back, 1.6));
  if (s === 3) for (let x = aw + 1; x < w - aw; x += 2) p.vline(x, sy + 1, sb - 1, lv(seat, 2.6));
  if (s === 4) { for (let x = aw + 1; x < w - aw; x++) p.put(x, by + 3 + Math.round(Math.sin(x * 0.9)), BLACK); for (let x = aw + 3; x < w - aw; x += 6) p.put(x, by + 6, m.acc); }
  if (s === 5) for (let i = 0; i < 2; i++) { const x = aw + 1 + i * ((w - 2 * aw) / 2); blk(p, x, by + 1, (w - 2 * aw) / 2 - 1, bh - 1, lv(back, 2.6)); }
  if (s === 7) { blk(p, aw + 1, by + 2, (w - 2 * aw) / 2 - 2, bh - 2, lv(back, 3.6)); blk(p, w / 2 + 1, by + 2, (w - 2 * aw) / 2 - 2, bh - 2, lv(back, 3.6)); }
  // assento (almofadas)
  blk(p, aw - 1, sy, w - 2 * aw + 2, sb - sy, seat);
  const nc = s === 0 || s === 1 ? 1 : s === 6 || s === 7 ? 2 : 3;
  for (let i = 1; i < nc; i++) p.vline(aw + Math.round(i * (w - 2 * aw) / nc), sy + 1, sb - 1, lv(seat, 1.6));
  if (s === 6) blk(p, aw + 3, sy - 4, 7, 5, m.acc);
  if (s === 7) blk(p, w - aw - 10, sy - 4, 7, 5, m.acc2);
  if (s === 2) { blk(p, aw + 2, sy - 3, 6, 4, m.fab2); }
  // braços
  const armL = (x: number) => {
    if (s === 0) { p.disc(x + aw / 2, sy - 1, aw / 2 + 0.5, arm); blk(p, x, sy - 1, aw, sb - sy + 1, arm); p.disc(x + aw / 2, sy - 1, 1.2, lv(arm, 1.6)); }
    else if (s === 1) { p.disc(x + aw / 2, sy + 1, aw / 2 + 0.5, arm); blk(p, x, sy + 1, aw, sb - sy - 1, arm); p.hline(x + 1, x + aw - 2, sy - 2, lv(arm, 4)); }
    else if (s === 2) { blk(p, x - 1, sy - 3, aw + 2, 2, m.wood); p.vline(x, sy - 1, sb - 1, m.wood); }
    else if (s === 3) { p.ellipse(x + aw / 2, sy + 1, aw / 2 + 0.5, 4, arm); blk(p, x, sy + 1, aw, sb - sy - 1, arm); }
    else if (s === 5) { p.disc(x + aw / 2, sy, aw / 2, arm); blk(p, x, sy, aw, sb - sy, arm); p.ring(x + aw / 2, sy, aw / 2 - 1.5, lv(arm, 1.6)); }
    else blk(p, x, sy - 3, aw, sb - sy + 3, arm);
  };
  armL(0); armL(w - aw);
  if (s === 5) { p.poly([[w - aw - 1, sy - 3], [w, sy - 3], [w, sb - 2], [w - aw - 3, sb + 1]], m.fab2); for (let y = sy - 2; y < sb; y += 2) p.hline(w - aw - 1, w - 1, y, lv(m.fab2, 4)); }
  // pés
  legs(d, 1, w - 2, sb);
}

/** Poltrona: bergère de abas → poltrona concha déco → poltrona ovo giratória → pufe de bolinhas → cadeira Memphis → reclinável de couro → poltrona de concha → reclinável inteligente. */
function armchair(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1;
  if (s === 0) { // bergère de abas
    blk(p, 3, 1, w - 6, 16, m.fab); p.poly([[3, 3], [w / 2, -1], [w - 3, 3]], m.fab); p.hline(5, w - 6, 0, m.wood2);
    blk(p, 0, 4, 4, 11, lv(m.fab, 2.4)); blk(p, w - 4, 4, 4, 11, lv(m.fab, 2.4));
    for (let y = 4; y < 15; y += 3) for (let x = 6 + ((y / 3) % 2) * 2; x < w - 6; x += 4) p.put(x, y, lv(m.fab, 1.4));
    blk(p, 1, 15, w - 2, 5, m.fab); p.hline(2, w - 3, 16, lv(m.fab, 4.4));
    legs(d, 2, w - 3, 20);
  } else if (s === 1) { // concha redonda
    p.ellipse(w / 2, 11, w / 2 - 0.5, 10, m.fab); for (let x = 3; x < w - 3; x += 3) p.vline(x, 3, 14, lv(m.fab, 2.2));
    blk(p, 3, 14, w - 6, 5, lv(m.fab, 3.4)); blk(p, 0, 12, w, 7, m.fab); p.hline(2, w - 3, 13, lv(m.fab, 4.2));
    blk(p, 1, 19, w - 2, fl - 18, m.wood2); p.hline(2, w - 3, 20, m.metal);
  } else if (s === 2) { // ovo giratório
    p.ellipse(w / 2, 10, w / 2 - 0.5, 10, m.fab2); p.ellipse(w / 2 + 2, 11, w / 2 - 4, 7, lv(m.fab2, 1.6));
    blk(p, 5, 13, w - 8, 5, m.fab); p.hline(6, w - 4, 13, lv(m.fab, 4.4));
    p.vline(w / 2, 20, fl - 1, CHROME); p.vline(w / 2 + 1, 20, fl - 1, lv(CHROME, 2)); p.line(w / 2, fl, 3, fl, CHROME); p.line(w / 2, fl, w - 4, fl, CHROME); p.hline(4, w - 5, fl, lv(CHROME, 2));
  } else if (s === 3) { // pufe (bean bag)
    p.ellipse(w / 2, fl - 7, w / 2 - 0.5, 7.5, m.fab); p.ellipse(w / 2 - 1, fl - 13, w / 2 - 4, 6, m.fab);
    p.ellipse(w / 2 + 2, fl - 9, 4, 2.5, lv(m.fab, 1.8)); p.line(6, fl - 16, 9, fl - 12, lv(m.fab, 4.2)); p.hline(3, w - 4, fl, lv(m.fab, 1));
    for (let i = 0; i < 6; i++) p.put(4 + i * 3, fl - 5 + (i % 2), m.acc2);
  } else if (s === 4) { // cadeira Memphis
    blk(p, 3, 2, w - 6, 10, m.fab2); p.disc(w / 2, 2, 4, m.acc); for (let x = 4; x < w - 4; x += 3) p.put(x, 6 + (x % 2), BLACK);
    blk(p, 1, 12, w - 2, 5, m.fab); p.poly([[1, 12], [5, 12], [3, 9]], m.acc2);
    legs(d, 1, w - 2, 17);
  } else if (s === 5) { // reclinável de couro marrom
    const lc = C('#6a3a24');
    blk(p, 3, 1, w - 6, 15, lc); p.ellipse(w / 2, 2, w / 2 - 3.5, 2.5, lc); for (let y = 4; y < 14; y += 4) p.hline(4, w - 5, y, lv(lc, 1.6));
    blk(p, 0, 10, 5, 9, lv(lc, 2.6)); blk(p, w - 5, 10, 5, 9, lv(lc, 2.6)); blk(p, 3, 14, w - 6, 5, lc);
    p.rect(w - 2, 15, 2, 3, CHROME); blk(p, 1, 19, w - 2, fl - 18, lv(lc, 1.6));
  } else if (s === 6) { // concha moldada em pés de madeira
    p.poly([[3, 2], [w - 3, 2], [w - 2, 14], [w - 4, 17], [4, 17], [2, 14]], W); p.hline(4, w - 5, 2, lv(W, 5)); p.line(3, 3, 3, 14, lv(W, 3));
    blk(p, 4, 12, w - 8, 3, m.fab); p.hline(5, w - 6, 12, lv(m.fab, 4.4));
    p.line(6, 17, 3, fl, m.wood); p.line(w - 7, 17, w - 4, fl, m.wood); p.line(8, 17, 9, fl, m.wood); p.line(w - 9, 17, w - 10, fl, m.wood); p.hline(5, w - 6, fl - 4, m.metal);
  } else { // reclinável inteligente com painel e luz
    blk(p, 2, 0, w - 4, 16, m.fab); p.ellipse(w / 2, 4, w / 2 - 4, 3, lv(m.fab, 3.6));
    blk(p, 0, 9, 4, 10, m.fab2); blk(p, w - 4, 9, 4, 10, m.fab2); p.rect(w - 3, 10, 2, 2, lit ? m.acc : DGREY); glow(d, w - 2, 11, 3, m.acc);
    blk(p, 3, 13, w - 6, 6, m.fab); blk(p, 2, 19, w - 4, fl - 19, m.acc2); p.hline(3, w - 4, fl, lit ? lv(m.acc, 5) : lv(m.acc, 2)); if (lit) d.fx.hline(1, w - 2, fl, withAlpha(m.acc, 120));
  }
}

/** Estante: entalhada com vidro → escalonada déco → aberta de teca → lambri com plantas → modular laqueada → pinho com CDs → prateleira de aço → nichos com LED. */
function bookcase(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fr = [m.wood, m.wood2, m.wood, m.wood, s === 4 ? m.wood2 : m.wood, m.wood, W, m.wood2][s];
  const top = s === 1 ? 4 : 0;
  if (s === 0) { blk(p, 0, 2, w, h - 2, fr); p.poly([[0, 3], [w / 2, 0], [w, 3]], m.wood2); }
  else if (s === 1) { blk(p, 6, 0, w - 12, 5, fr); blk(p, 2, 3, w - 4, 4, fr); blk(p, 0, top + 2, w, h - top - 2, fr); p.hline(1, w - 2, top + 3, m.metal); }
  else if (s === 6) { p.vline(0, 0, h - 1, m.metal); p.vline(w - 1, 0, h - 1, m.metal); }
  else blk(p, 0, 0, w, h, fr);
  const sh = s === 1 ? [10, 19, 28] : [8, 17, 26];
  const yb0 = s === 0 ? 4 : s === 1 ? 8 : 2;
  const ix = s === 6 ? 1 : 2, iw = w - 2 * ix;
  if (s !== 6) p.rect(ix, yb0, iw, h - yb0 - 6, lv(fr, 0.8));
  const shelf = (y: number) => { if (s === 6) { p.hline(0, w - 1, y, m.metal); p.hline(1, w - 2, y + 1, lv(W, 2)); } else p.hline(ix, ix + iw - 1, y, lv(fr, 3.4)); };
  const rows = [yb0 + sh[0], yb0 + sh[1], yb0 + sh[2] < h - 6 ? yb0 + sh[2] : h - 7];
  const pal = [[m.fab, C('#3a5a3a'), C('#5a3a20'), C('#2a3a5a')], [BLACK, C('#e6dac0'), m.acc, m.acc2], [C('#e04848'), C('#48a8a0'), C('#f0d040'), C('#e8e0c0')], [C('#d8782a'), C('#a8862a'), C('#7a8a2a'), C('#4a2c18')], [C('#e04898'), C('#3ac0d0'), BLACK, C('#f0e040')], [C('#3a6ac8'), C('#8a3a2a'), C('#d8a030'), C('#3a3a3a')], [W, C('#c8c4bc'), C('#2a2a2e'), C('#c8784a')], [C('#4a4c56'), C('#8a8c96'), C('#d8dce4'), C('#2a2c34')]][s];
  rows.forEach((y, i) => {
    shelf(y);
    if (s === 3 && i === 1) { blk(p, ix + 2, y - 4, 5, 4, C('#a8401a')); foliage(p, ix + 4.5, y - 7, 3.5, 3, 19, C('#5a7a2a'), C('#7a9a3a')); books(p, ix + 10, y - 1, iw - 12, 6, i + s * 7, pal); return; }
    if (s === 5 && i === 2) { for (let x = ix + 1; x < ix + iw - 1; x++) p.rect(x, y - 5, 1, 5, x % 2 ? C('#c8ccd8') : pal[x % 4]); return; }
    if (s === 6 && i === 1) { p.poly([[ix + 4, y], [ix + 8, y], [ix + 7, y - 6], [ix + 5, y - 6]], C('#e8e4dc')); blk(p, ix + 13, y - 2, 8, 2, m.acc); return; }
    if (s === 2 && i === 0) { p.ellipse(ix + 5, y - 2, 3, 2, C('#48a8a0')); books(p, ix + 10, y - 1, iw - 11, 6, 31, pal); return; }
    if (s === 4 && i === 1) { blk(p, ix + 2, y - 6, 8, 6, C('#2a2a30')); p.rect(ix + 3, y - 5, 6, 4, lit ? C('#6a8ae0') : C('#2a3a6a')); glow(d, ix + 6, y - 3, 4, C('#6a8ae0')); books(p, ix + 12, y - 1, iw - 13, 6, 41, pal); return; }
    books(p, ix + 1, y - 1, iw - 2, 7, i + s * 7, pal);
  });
  if (s === 0) { p.rect(ix, rows[1] + 1, iw, h - rows[1] - 7, withAlpha(m.glass, 90)); p.line(ix + 2, rows[1] + 3, ix + 6, rows[1] + 8, withAlpha(W, 120)); p.vline(w >> 1, rows[1] + 1, h - 7, m.wood2); }
  if (s === 7) for (const y of rows) { p.hline(ix, ix + iw - 1, y - 8, lit ? lv(m.acc, 5) : lv(m.acc, 1.6)); if (lit) d.fx.rect(ix, y - 7, iw, 2, withAlpha(m.acc, 60)); }
  // base / gavetas
  if (s === 6) { p.hline(0, w - 1, h - 1, m.metal); blk(p, 1, h - 6, w - 2, 5, m.wood); }
  else { blk(p, 0, h - 6, w, 6, lv(fr, 2.6)); p.vline(w >> 1, h - 5, h - 2, lv(fr, 1.4)); p.put((w >> 1) - 3, h - 4, m.metal); p.put((w >> 1) + 2, h - 4, m.metal); }
}

/** Jukebox (desde os anos 30): arco de madeira com luz → cromado bolha anos 50 → caixa de vidro anos 70 → CD neon → parede de CDs → touch digital → streaming de pé. */
function jukebox(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const L = (c: Col, n = 4.6) => (lit ? lv(c, n) : c);
  if (s === 1) { // arco de madeira, grade e tubo âmbar
    p.disc(w / 2, 10, w / 2 - 0.5, m.wood2); blk(p, 0, 10, w, h - 10, m.wood2);
    p.disc(w / 2, 10, w / 2 - 3, L(C('#c87a2a'))); p.disc(w / 2, 10, w / 2 - 5, m.wood); p.rect(3, 10, w - 6, 6, m.wood);
    for (let x = 5; x < w - 5; x += 2) p.vline(x, 18, 26, m.metal); p.rect(3, 28, w - 6, 3, m.wood); p.hline(3, w - 4, 28, m.metal);
    glow(d, w / 2, 10, 11, C('#f0a040'));
  } else if (s === 2) { // bolha cromada com tubos coloridos
    p.disc(w / 2, 9, w / 2 - 0.5, CHROME); blk(p, 0, 9, w, h - 9, m.wood);
    p.disc(w / 2, 9, w / 2 - 2.5, L(C('#e04848'))); p.disc(w / 2, 9, w / 2 - 4.5, L(C('#f0d040'))); p.disc(w / 2, 10, w / 2 - 6.5, L(C('#48a8a0')));
    p.rect(4, 10, w - 8, 7, BLACK); p.disc(w / 2, 13, 3, C('#2a2a2a')); p.disc(w / 2, 13, 1, RED);
    p.rect(2, 18, w - 4, 4, PAPER); for (let x = 3; x < w - 3; x += 3) p.vline(x, 18, 21, lv(PAPER, 2));
    for (let x = 3; x < w - 3; x += 2) p.vline(x, 24, h - 4, CHROME); p.vline(1, 9, h - 2, L(C('#e04848'))); p.vline(w - 2, 9, h - 2, L(C('#e04848')));
    glow(d, w / 2, 10, 12, C('#f0a0a0'));
  } else if (s === 3) { // caixa com vidro e lâmpadas laranja
    blk(p, 0, 0, w, h, m.wood); p.rect(2, 2, w - 4, 12, C('#2a1a10')); p.rect(3, 3, w - 6, 10, withAlpha(C('#c8b070'), 120)); p.disc(w / 2, 9, 3, C('#3a2a2a'));
    for (let i = 0; i < 5; i++) p.disc(3.5 + i * 3.7, 16, 1.2, L(m.fab)); p.rect(2, 18, w - 4, 5, PAPER); for (let y = 19; y < 23; y += 2) p.hline(3, w - 4, y, lv(PAPER, 2));
    for (let y = 25; y < h - 2; y += 2) p.hline(2, w - 3, y, lv(m.wood, 1.6)); glow(d, w / 2, 16, 10, C('#f0a040'));
  } else if (s === 4) { // CD com neon rosa e azul
    blk(p, 0, 2, w, h - 2, BLACK); p.rect(2, 0, w - 4, 3, L(C('#ff5ab0'))); p.vline(1, 3, h - 2, L(C('#3ac0d0'))); p.vline(w - 2, 3, h - 2, L(C('#3ac0d0')));
    p.rect(3, 5, w - 6, 9, C('#1a1a2a')); p.disc(w / 2, 9.5, 3.5, C('#d8dce8')); p.disc(w / 2, 9.5, 1, BLACK); p.line(w / 2 - 2, 7, w / 2 + 2, 11, C('#f0a0e0'));
    for (let i = 0; i < 6; i++) p.rect(3 + (i % 3) * 6, 17 + Math.floor(i / 3) * 3, 4, 2, i === 1 ? L(C('#f0e040')) : DGREY);
    for (let y = 24; y < h - 2; y += 2) p.hline(3, w - 4, y, C('#3a3a42')); glow(d, w / 2, 2, 10, C('#ff5ab0'));
  } else if (s === 5) { // parede de CDs
    blk(p, 0, 0, w, h, C('#3a3a42')); p.rect(2, 2, w - 4, 14, C('#1a1a1e'));
    for (let i = 0; i < 12; i++) p.rect(3 + (i % 4) * 4, 3 + Math.floor(i / 4) * 4, 3, 3, L([C('#c8ccd8'), C('#3a6ac8'), C('#e04848'), C('#d8a030')][i % 4], 4));
    p.rect(3, 18, w - 6, 4, L(C('#3a7a4a'), 4)); drawText(p, '42', 4, 18, C('#1a3a1a'));
    p.rect(2, 24, w - 4, h - 26, C('#2a2a30')); for (let y = 25; y < h - 2; y += 2) for (let x = 3; x < w - 3; x += 2) p.put(x, y, C('#4a4a52'));
    glow(d, w / 2, 9, 8, C('#c8d8ff'));
  } else if (s === 6) { // touch digital na parede, sobre um móvel
    blk(p, 2, 0, w - 4, 20, C('#e8e6e0')); p.rect(3, 1, w - 6, 18, lit ? C('#3a5ac8') : C('#1a2a4a'));
    for (let i = 0; i < 6; i++) p.rect(4 + (i % 3) * 5, 3 + Math.floor(i / 3) * 6, 4, 4, lit ? [C('#e04848'), C('#f0c040'), C('#48b85c')][i % 3] : DGREY);
    p.rect(w / 2 - 1, 20, 2, 4, m.metal); blk(p, 0, 24, w, h - 24, m.wood); p.hline(2, w - 3, 28, lv(m.wood, 1.6)); glow(d, w / 2, 10, 10, C('#6a8ae0'));
  } else { // coluna de streaming com anel de luz
    blk(p, 3, 4, w - 6, h - 4, C('#2a2c34')); p.ellipse(w / 2, 4, w / 2 - 3, 2, C('#3a3c44'));
    p.ellipse(w / 2, 4, w / 2 - 4, 1.2, lit ? lv(m.acc, 5) : lv(m.acc, 1.6));
    for (let y = 8; y < h - 3; y += 2) for (let x = 4 + (y % 4 === 0 ? 1 : 0); x < w - 4; x += 2) p.put(x, y, C('#3a3c46'));
    p.rect(5, 12, w - 10, 6, lit ? C('#2a3a5a') : C('#14141a')); p.hline(6, w - 7, 15, lit ? m.acc : DGREY);
    glow(d, w / 2, 4, 9, m.acc);
  }
}

/** Aquário: globo de vidro em pedestal de ferro → caixa déco → móvel anos 50 → aquário com luz ambar → neon → tanque de vidro em rack → retângulo branco → aquário com tela e LED. */
function aquarium(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const water = lit ? C('#6ad0f0') : C('#3a8ab8');
  const fish = (x: number, y: number, c: Col, r = false) => { p.rect(x, y, 3, 2, c); p.put(r ? x - 1 : x + 3, y, lv(c, 2)); p.put(r ? x - 1 : x + 3, y + 1, lv(c, 2)); p.put(r ? x + 2 : x, y, BLACK); };
  if (s === 0) {
    p.disc(w / 2, 10, 9, withAlpha(water, 220)); p.ellipse(w / 2, 2, 5, 1.2, withAlpha(W, 160)); p.line(w / 2 - 6, 6, w / 2 - 3, 3, withAlpha(W, 180));
    fish(w / 2 - 3, 9, C('#f08a30')); fish(w / 2 + 2, 13, C('#e04848'), true); foliage(p, w / 2 + 4, 15, 2, 3, 3);
    p.rect(w / 2 - 3, 19, 6, 2, m.metal); p.vline(w / 2, 21, h - 4, BLACK); p.line(w / 2, h - 5, w / 2 - 6, h - 1, BLACK); p.line(w / 2, h - 5, w / 2 + 6, h - 1, BLACK);
    p.disc(w / 2 - 6, h - 1, 0.9, BLACK); p.disc(w / 2 + 6, h - 1, 0.9, BLACK); for (let i = 0; i < 3; i++) p.put(w / 2 - 2 + i * 2, 22 + i, BLACK);
    glow(d, w / 2, 10, 10, C('#9ae0ff'));
    return;
  }
  const ty = s === 2 || s === 5 ? 2 : 4, th = s === 6 ? 16 : 14, tx = s === 6 ? 1 : 2, tw = w - 2 * tx;
  const rim = [0, m.metal, m.wood, m.wood2, BLACK, DGREY, W, C('#2a2c34')][s];
  blk(p, tx, ty, tw, 2, rim);
  p.rect(tx, ty + 2, tw, th, water); p.vline(tx, ty + 2, ty + th + 1, lv(rim, 2)); p.vline(tx + tw - 1, ty + 2, ty + th + 1, lv(rim, 2));
  p.hline(tx + 1, tx + tw - 2, ty + th, C('#d8c088')); p.hline(tx + 1, tx + tw - 2, ty + th + 1, C('#c8a868'));
  foliage(p, tx + 4, ty + th - 3, 2, 4, 5 + s); foliage(p, tx + tw - 6, ty + th - 2, 2, 3, 9 + s);
  fish(tx + 7, ty + 6, s === 4 ? C('#ff5ab0') : C('#f08a30')); fish(tx + 15, ty + 10, s === 3 ? C('#f0c040') : C('#e04848'), true); if (s >= 5) fish(tx + 11, ty + 4, C('#3ac0d0'));
  p.line(tx + 2, ty + 3, tx + 5, ty + 6, withAlpha(W, 140));
  if (s === 3) p.rect(tx, ty + 2, tw, th, withAlpha(C('#f0a040'), 40));
  if (s === 4) { p.hline(tx, tx + tw - 1, ty + 2, lit ? C('#ff5ab0') : C('#a03a80')); }
  if (s === 7) { blk(p, tx + tw - 7, ty + 3, 5, 3, C('#1a1a1e')); drawText(p, '24', tx + tw - 7, ty + 3, lit ? m.acc : DGREY); }
  // móvel
  const sy = ty + th + 2;
  if (s === 1) { blk(p, 0, sy, w, h - sy, m.wood2); p.hline(1, w - 2, sy + 1, m.metal); for (let i = 0; i < 3; i++) p.hline(3 + i * 2, w - 4 - i * 2, h - 4 + i, lv(m.wood2, 3)); }
  else if (s === 2) { blk(p, 1, sy, w - 2, 7, m.wood); p.vline(w >> 1, sy + 1, sy + 5, lv(m.wood, 1.4)); legs(d, 2, w - 3, sy + 7); }
  else if (s === 3) { blk(p, 0, sy, w, h - sy, m.wood); for (let x = 2; x < w - 2; x += 2) p.vline(x, sy + 2, h - 2, lv(m.wood, 1.8)); }
  else if (s === 4) { blk(p, 1, sy, w - 2, h - sy, m.wood2); p.rect(3, sy + 3, w - 6, 2, m.acc); p.disc(6, h - 4, 1.5, m.fab); }
  else if (s === 5) { p.hline(1, w - 2, sy, GREY); for (const x of [1, w - 2]) p.vline(x, sy, h - 1, GREY); p.hline(1, w - 2, h - 5, GREY); blk(p, 4, h - 4, 6, 3, C('#3a6a3a')); }
  else if (s === 6) { blk(p, 0, sy, w, h - sy, W); p.hline(2, w - 3, sy + 4, lv(W, 2)); }
  else { blk(p, 0, sy, w, h - sy, C('#2a2c34')); p.hline(1, w - 2, h - 1, lit ? lv(m.acc, 5) : lv(m.acc, 2)); if (lit) d.fx.hline(0, w - 1, h - 1, withAlpha(m.acc, 110)); }
  glow(d, w / 2, ty + th / 2, 14, C('#9ae0ff'));
}

/** Planta grande: palmeira em cachepô de faiança → strelitzia em vaso déco → costela-de-adão em vaso de pés → samambaia no macramê → ficus em vaso laqueado → árvore-da-felicidade em vaso de barro → oliveira em vaso de concreto → horta inteligente com luz. */
function bigplant(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1;
  const pot = (x: number, y: number, pw: number, ph: number, c: Col, taper = 1) => { p.poly([[x, y], [x + pw, y], [x + pw - taper, fl + 1], [x + taper, fl + 1]], c); p.hline(x, x + pw - 1, y, lv(c, 4.4)); p.vline(x + 1, y + 1, fl - 1, lv(c, 3.6)); p.hline(x + taper, x + pw - taper - 1, fl, lv(c, 1.2)); };
  if (s === 0) { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55; const ex = w / 2 + Math.cos(a) * 9, ey = 13 + Math.sin(a) * 11; p.line(w / 2, 20, ex, ey, LEAF); for (let k = 2; k < 8; k++) { const t = k / 8; p.put(w / 2 + (ex - w / 2) * t + (i < 2 ? -1 : 1), 20 + (ey - 20) * t + 1, LEAF2); } } pot(2, 20, w - 4, 11, C('#3a6ac8'), 2); p.hline(3, w - 4, 24, W); p.hline(3, w - 4, 26, C('#f0d040')); }
  else if (s === 1) { for (const [x, y, dx] of [[5, 6, -1], [9, 3, 1], [11, 9, 1]] as const) { p.line(w / 2, 20, x, y, LEAF); p.poly([[x, y], [x + 4 * dx, y - 2], [x + 2 * dx, y + 1]], C('#f08a30')); p.put(x + dx, y - 2, C('#3a6ac8')); } foliage(p, w / 2, 17, 5, 4, 11); blk(p, 3, 20, w - 6, fl - 19, BLACK); p.hline(3, w - 4, 22, m.metal); p.hline(4, w - 5, 27, m.metal); }
  else if (s === 2) { for (const [x, y] of [[4, 6], [12, 4], [8, 10], [3, 13], [13, 12]] as const) { p.line(w / 2, 22, x, y + 2, LEAF); p.ellipse(x, y, 3, 2.5, LEAF2); p.put(x, y, LEAF); p.put(x - 1, y + 1, C('#a8c870')); } p.poly([[3, 20], [13, 20], [11, 25], [5, 25]], W); p.hline(3, 12, 20, lv(W, 4)); p.line(5, 25, 3, fl, m.wood2); p.line(11, 25, 13, fl, m.wood2); p.line(8, 25, 8, fl, m.wood2); }
  else if (s === 3) { p.vline(w / 2, 0, 6, C('#c8a060')); p.line(w / 2, 6, 3, 14, C('#c8a060')); p.line(w / 2, 6, w - 4, 14, C('#c8a060')); for (let y = 7; y < 14; y += 2) p.put(w / 2 + ((y % 4) - 1), y, C('#a8803a')); blk(p, 3, 12, w - 6, 5, C('#a8401a')); for (let i = 0; i < 7; i++) { const x = 2 + i * 2; p.line(x, 14, x - 1 + (i % 2) * 2, 23 + (i % 3) * 2, LEAF); p.put(x, 16 + (i % 3), LEAF2); } p.vline(w / 2 - 3, 17, fl, C('#c8a060')); p.vline(w / 2 + 3, 17, fl, C('#c8a060')); blk(p, 4, fl - 2, w - 8, 3, m.wood); }
  else if (s === 4) { p.vline(w / 2, 6, 22, C('#6a4a2a')); foliage(p, w / 2, 8, 6.5, 6, 21); foliage(p, w / 2 - 2, 13, 5, 4, 22); blk(p, 3, 21, w - 6, fl - 20, m.acc2); p.hline(3, w - 4, 23, m.acc); }
  else if (s === 5) { p.vline(w / 2, 10, 21, C('#7a5a3a')); p.vline(w / 2 + 1, 12, 21, C('#7a5a3a')); for (const [x, y] of [[w / 2 - 3, 6], [w / 2 + 4, 4], [w / 2, 10]] as const) foliage(p, x, y, 4, 2.5, 30 + x); pot(3, 21, w - 6, 10, C('#b8603a'), 1); p.hline(3, w - 4, 22, lv(C('#b8603a'), 2)); }
  else if (s === 6) { p.line(w / 2, 22, w / 2 - 1, 8, C('#6a5a48')); p.line(w / 2 - 1, 12, w / 2 + 3, 6, C('#6a5a48')); for (let i = 0; i < 14; i++) p.put(3 + noise(i, 1, 61) * 10, 2 + noise(i, 2, 61) * 12, i % 3 ? C('#8aa07a') : C('#6a8060')); foliage(p, w / 2, 7, 5, 5, 62, C('#7a9070'), C('#9ab08a')); blk(p, 2, 22, w - 4, fl - 21, C('#b8b4ac')); for (let i = 0; i < 6; i++) p.put(4 + i * 2, 25 + (i % 3) * 2, lv(C('#b8b4ac'), 2)); }
  else { p.hline(1, w - 2, 1, C('#d8dce4')); p.vline(1, 1, 3, C('#d8dce4')); p.vline(w - 2, 1, 3, C('#d8dce4')); p.rect(3, 3, w - 6, 1, lit ? C('#e070ff') : C('#5a3a6a')); if (lit) d.fx.poly([[3, 4], [w - 3, 4], [w, 20], [0, 20]], withAlpha(C('#e070ff'), 40)); p.vline(w >> 1, 0, 0, C('#d8dce4')); for (let r = 0; r < 3; r++) foliage(p, 4 + r * 4, 11 + (r % 2) * 3, 2.5, 4, 70 + r); blk(p, 1, 17, w - 2, fl - 16, C('#2a2c34')); p.rect(3, 19, 4, 2, lit ? m.acc : DGREY); p.vline(1, 3, 17, C('#d8dce4')); p.vline(w - 2, 3, 17, C('#d8dce4')); }
}

/** Abajur de pé: lâmpada de franja → torchière déco → cone triplo → arco cromado com globo → halógena → cúpula de tecido → tripé → coluna de LED. */
function floorlamp(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1, cx = w >> 1;
  const base = (bw: number, c: Col) => { blk(p, cx - (bw >> 1), fl - 1, bw, 2, c); };
  if (s === 0) { p.poly([[1, 9], [w - 1, 9], [w - 3, 2], [3, 2]], lit ? lv(m.fab, 4.4) : m.fab); for (let x = 1; x < w; x += 2) p.vline(x, 10, 12, m.fab2); p.vline(cx, 13, fl - 2, m.metal); p.put(cx - 1, 24, m.metal); p.put(cx + 1, 24, m.metal); base(8, m.wood2); glow(d, cx, 9, 9, C('#ffb080')); }
  else if (s === 1) { p.poly([[0, 1], [w, 1], [cx + 2, 7], [cx - 2, 7]], m.metal); p.hline(0, w - 1, 0, lit ? BULB : lv(m.metal, 4)); p.vline(cx, 7, fl - 3, BLACK); p.vline(cx - 1, 7, fl - 3, lv(BLACK, 3)); blk(p, cx - 3, fl - 3, 6, 2, m.metal); base(8, BLACK); if (lit) d.fx.poly([[0, 0], [w, 0], [w + 2, -6], [-2, -6]], withAlpha(GLOW, 80)); }
  else if (s === 2) { p.vline(cx, 6, fl - 1, BLACK); for (const [x, y, c] of [[1, 3, m.acc], [w - 5, 8, m.acc2], [2, 14, C('#f8f0e0')]] as const) { p.line(cx, y + 3, x + 2, y + 2, BLACK); p.poly([[x, y + 4], [x + 4, y + 4], [x + 3, y], [x + 1, y]], c); if (lit) d.fx.disc(x + 2, y + 5, 2.5, withAlpha(GLOW, 90)); } p.line(cx, fl - 1, 1, fl, BLACK); p.line(cx, fl - 1, w - 2, fl, BLACK); }
  else if (s === 3) { p.line(cx - 3, fl - 1, cx - 2, 12, CHROME); p.line(cx - 2, 12, cx + 1, 4, CHROME); p.line(cx + 1, 4, w - 3, 6, CHROME); ball(p, w - 3, 8, 2.6, lit ? BULB : C('#f0e8d0')); blk(p, cx - 5, fl - 2, 6, 3, C('#e8e4dc')); glow(d, w - 3, 9, 7); }
  else if (s === 4) { p.ellipse(cx, 2, cx, 1.5, BLACK); p.hline(1, w - 2, 1, lit ? BULB : C('#5a5a62')); p.vline(cx, 3, fl - 2, BLACK); p.rect(cx - 1, 20, 3, 2, m.acc); base(8, BLACK); if (lit) d.fx.poly([[0, 1], [w, 1], [w + 3, -3], [-3, -3]], withAlpha(BULB, 120)); }
  else if (s === 5) { p.poly([[1, 10], [w - 1, 10], [w - 3, 2], [3, 2]], lit ? lv(C('#e8dcc0'), 4.6) : C('#e8dcc0')); p.hline(1, w - 2, 10, lv(C('#e8dcc0'), 2)); p.vline(cx, 11, fl - 2, m.wood); p.vline(cx - 1, 11, fl - 2, lv(m.wood, 3)); base(8, m.wood); glow(d, cx, 10, 8); }
  else if (s === 6) { p.ellipse(cx, 4, cx - 0.5, 3, W); p.hline(1, w - 2, 7, lit ? BULB : lv(W, 2)); p.line(cx, 8, cx, 14, m.metal); p.line(cx, 14, 1, fl, m.wood); p.line(cx, 14, w - 2, fl, m.wood); p.line(cx, 14, cx, fl, m.wood); glow(d, cx, 7, 8); }
  else { blk(p, cx - 2, 0, 5, fl - 1, C('#2a2c34')); p.vline(cx, 1, fl - 3, lit ? lv(m.acc, 5) : lv(m.acc, 1.6)); base(8, C('#2a2c34')); if (lit) d.fx.rect(cx - 3, 0, 7, fl - 1, withAlpha(m.acc, 50)); }
}

/** Mesa de centro: entalhada com tampo de mármore → laca preta com dourado → bumerangue → baixa de vidro e cromo → tampo triangular Memphis → caixote de pinho → tampo fino de carvalho → mesa com tampo de vidro e carregador. */
function coffeetable(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  if (s === 0) { blk(p, 0, 0, w, 3, C('#e8e4d8')); for (let i = 0; i < 4; i++) p.put(3 + i * 7, 1, C('#b8b4a8')); blk(p, 1, 3, w - 2, 2, m.wood); p.put(w >> 1, 4, m.metal); legs(d, 2, w - 3, 5); }
  else if (s === 1) { blk(p, 0, 0, w, 3, BLACK); p.hline(0, w - 1, 2, m.metal); blk(p, 3, 3, w - 6, h - 3, m.wood2); p.hline(4, w - 5, 6, m.metal); p.hline(5, w - 6, h - 3, lv(m.wood2, 3)); }
  else if (s === 2) { p.poly([[0, 1], [w * 0.4, 0], [w - 1, 2], [w - 3, 4], [w * 0.5, 3], [2, 4]], m.wood); p.hline(2, w - 4, 0, lv(m.wood, 4.4)); p.line(4, 4, 2, h - 1, BLACK); p.line(w - 5, 4, w - 3, h - 1, BLACK); p.line(w / 2, 3, w / 2 + 1, h - 1, BLACK); p.disc(9, 1, 1.4, m.acc); }
  else if (s === 3) { p.rect(0, 0, w, 2, withAlpha(m.glass, 200)); p.hline(0, w - 1, 0, lv(m.glass, 5)); p.rect(1, 2, 2, h - 2, CHROME); p.rect(w - 3, 2, 2, h - 2, CHROME); p.hline(1, w - 2, h - 1, CHROME); blk(p, 6, h - 5, 6, 4, C('#7a8a2a')); }
  else if (s === 4) { p.poly([[0, 3], [w - 1, 0], [w - 4, 3]], m.fab); p.hline(0, w - 4, 3, lv(m.fab, 1.6)); blk(p, 3, 4, 4, h - 4, m.fab2); p.disc(w - 8, h - 4, 3.5, m.acc); p.rect(w - 9, 4, 2, 4, BLACK); }
  else if (s === 5) { blk(p, 0, 0, w, h, m.wood); for (let y = 2; y < h - 1; y += 3) p.hline(1, w - 2, y, lv(m.wood, 2)); p.rect(3, 4, w - 6, h - 6, lv(m.wood, 1.2)); books(p, 5, h - 3, 10, 4, 77, [C('#3a6ac8'), C('#8a3a2a'), C('#d8a030')]); }
  else if (s === 6) { blk(p, 0, 0, w, 2, m.wood); legs(d, 1, w - 2, 2); }
  else { p.rect(0, 0, w, 2, withAlpha(C('#30404c'), 220)); p.hline(0, w - 1, 0, C('#8aa0b0')); p.rect(w - 8, 0, 4, 1, lit ? m.acc : DGREY); glow(d, w - 6, 0, 3, m.acc); blk(p, 3, 2, w - 6, h - 2, C('#2a2c34')); p.hline(4, w - 5, h - 1, lit ? lv(m.acc, 5) : lv(m.acc, 2)); }
}

/** Aparelho de som: gramofone de corneta → radiola de válvulas → console hi-fi → torre de receiver e tape-deck → 3 em 1 com equalizador → micro system → toca-discos no aparador → caixa inteligente no aparador. */
function stereo(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const knob = (x: number, y: number) => { p.disc(x, y, 1.2, CHROME); p.put(x - 1, y - 1, W); };
  if (s === 0) { blk(p, 6, 12, 18, h - 12, m.wood); p.hline(7, 22, 14, m.metal); p.ellipse(15, 11, 7, 1.2, BLACK); p.vline(19, 7, 11, m.metal); p.line(19, 7, 14, 3, m.metal); p.poly([[14, 4], [3, 0], [0, 7], [10, 7]], m.metal); p.ellipse(2, 3.5, 2, 4, lv(m.metal, 1.4)); p.line(4, 1, 8, 5, lv(m.metal, 5)); for (let x = 9; x < 21; x += 3) p.vline(x, 17, h - 3, lv(m.wood, 1.8)); return; }
  if (s === 1) { blk(p, 0, 4, w, h - 6, m.wood2); p.poly([[2, 4], [w / 2, 0], [w - 2, 4]], m.wood2); p.rect(3, 6, 12, 12, C('#c8a878')); for (let x = 4; x < 15; x += 2) p.vline(x, 7, 16, m.wood); p.rect(17, 7, 10, 4, lit ? C('#f0c060') : C('#a8803a')); p.vline(21, 7, 10, RED); knob(19, 15); knob(25, 15); p.rect(1, h - 2, 2, 2, m.wood2); p.rect(w - 3, h - 2, 2, 2, m.wood2); glow(d, 22, 9, 4, C('#f0c060')); return; }
  if (s === 2) { blk(p, 0, 2, w, 13, m.wood); p.rect(2, 4, 9, 9, C('#d8c8a0')); for (let y = 5; y < 13; y += 2) p.hline(2, 10, y, lv(C('#d8c8a0'), 2)); p.rect(w - 11, 4, 9, 9, C('#d8c8a0')); for (let y = 5; y < 13; y += 2) p.hline(w - 11, w - 3, y, lv(C('#d8c8a0'), 2)); p.rect(12, 4, 6, 4, lit ? C('#f0d070') : C('#8a7a4a')); knob(13.5, 11); knob(16.5, 11); legs(d, 1, w - 2, 15); return; }
  if (s === 3) { blk(p, 2, 0, w - 4, 7, CHROME); p.rect(4, 2, 12, 3, lit ? C('#80c0f0') : C('#2a4a6a')); p.vline(9, 2, 4, RED); knob(20, 3.5); knob(24, 3.5); blk(p, 2, 7, w - 4, 7, C('#2a2a2a')); p.rect(5, 9, 5, 3, C('#5a4a3a')); p.disc(6.5, 10.5, 0.9, BLACK); p.disc(8.5, 10.5, 0.9, BLACK); for (let i = 0; i < 4; i++) p.rect(14 + i * 3, 10, 2, 2, CHROME); blk(p, 0, 14, w, h - 14, m.wood); p.hline(1, w - 2, 16, lv(m.wood, 1.6)); glow(d, 10, 3, 5, C('#80c0f0')); return; }
  if (s === 4) { blk(p, 6, 0, w - 12, h, BLACK); for (let i = 0; i < 7; i++) { const lvl = 2 + Math.round(noise(i, 4, 81) * 3); for (let k = 0; k < lvl; k++) p.put(9 + i * 2, 5 - k, lit ? (k > 3 ? RED : m.acc) : DGREY); } p.rect(8, 7, w - 16, 4, C('#3a3a42')); p.rect(9, 8, 4, 2, C('#1a1a1e')); p.rect(15, 8, 4, 2, C('#1a1a1e')); p.hline(8, w - 9, 13, m.fab); for (const x of [0, w - 6]) { blk(p, x, 4, 6, h - 4, C('#2a2a30')); p.disc(x + 3, 9, 2, C('#4a4a52')); p.disc(x + 3, 9, 0.8, BLACK); p.disc(x + 3, 17, 2.5, C('#4a4a52')); p.disc(x + 3, 17, 1, BLACK); } glow(d, w / 2, 3, 6, m.acc); return; }
  if (s === 5) { blk(p, 9, 6, 12, 10, C('#4a4a52')); p.rect(11, 8, 8, 2, lit ? C('#80f0a0') : C('#2a4a3a')); p.disc(15, 13, 1.6, C('#c8ccd8')); for (const x of [1, w - 8]) { blk(p, x, 4, 7, 14, C('#3a3a42')); p.disc(x + 3.5, 8, 1.6, BLACK); p.disc(x + 3.5, 13, 2.4, BLACK); } blk(p, 0, 18, w, h - 18, m.wood); p.hline(1, w - 2, 20, lv(m.wood, 1.8)); glow(d, 15, 9, 4, C('#80f0a0')); return; }
  if (s === 6) { blk(p, 0, 9, w, 6, m.wood); p.hline(1, w - 2, 12, lv(m.wood, 1.6)); legs(d, 1, w - 2, 15); blk(p, 8, 5, 14, 4, W); p.ellipse(14, 5, 5, 1, BLACK); p.ellipse(14, 5, 1.6, 0.6, m.acc2); p.line(20, 4, 18, 5, m.metal); blk(p, 1, 2, 5, 7, C('#e8e6e0')); p.disc(3.5, 5, 1.4, DGREY); blk(p, w - 6, 2, 5, 7, C('#e8e6e0')); p.disc(w - 3.5, 5, 1.4, DGREY); return; }
  blk(p, 0, 11, w, 6, m.wood); legs(d, 1, w - 2, 17); blk(p, 11, 1, 8, 10, C('#4c4e56')); p.ellipse(15, 1, 3.5, 1, lit ? lv(m.acc, 5) : C('#3a3c44')); for (let y = 3; y < 10; y += 2) for (let x = 12; x < 18; x += 2) p.put(x, y, C('#3a3c44')); glow(d, 15, 1, 5, m.acc);
  blk(p, 3, 7, 5, 4, C('#d8dce4')); p.rect(4, 8, 3, 2, lit ? C('#3a5ac8') : C('#14141a'));
}

/** Escultura no pedestal: busto clássico → gazela déco → forma orgânica → totem de resina → torre geométrica → peça de sucata → monólito branco → escultura de luz. */
function sculpture(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const ped = s === 6 ? W : s === 7 ? C('#2a2c34') : s === 4 ? m.acc2 : s === 1 ? BLACK : s === 5 ? C('#8a8c94') : C('#e8e4d8');
  const py = 16;
  blk(p, 1, py, w - 2, h - py, ped); blk(p, 0, py, w, 2, lv(ped, 4)); blk(p, 0, h - 2, w, 2, lv(ped, 2.4));
  if (s === 0) { const mb = C('#ece8dc'); p.poly([[2, py], [w - 2, py], [w - 3, 11], [3, 11]], mb); p.rect(5, 9, 4, 3, mb); p.ellipse(7, 6, 3, 3.5, mb); p.put(5, 4, lv(mb, 2)); p.put(9, 6, lv(mb, 1.6)); p.hline(3, w - 4, 11, lv(mb, 4.4)); }
  else if (s === 1) { p.poly([[2, py], [w - 2, py], [w - 3, py - 2], [3, py - 2]], m.metal); p.line(3, py - 3, 10, 7, m.metal); p.line(4, py - 3, 11, 7, m.metal); p.line(6, 10, 3, 6, m.metal); p.line(10, 8, 12, 3, m.metal); p.put(12, 2, m.metal); p.rect(9, 6, 3, 2, m.metal); }
  else if (s === 2) { p.ellipse(7, 9, 4.5, 6.5, C('#3a2a20')); p.disc(7, 7, 1.6, ped); p.ellipse(7, 13, 2, 1.5, C('#e8e4d8')); p.line(4, 5, 5, 3, lv(C('#3a2a20'), 4)); }
  else if (s === 3) { for (let y = 2; y < py; y++) { const r = 2.5 + Math.sin(y * 0.6) * 1.5; p.hline(Math.round(7 - r), Math.round(7 + r), y, [m.fab, m.acc, m.fab2, m.acc2][Math.floor(y / 4) % 4]); } }
  else if (s === 4) { blk(p, 3, 9, 8, 7, m.acc); p.poly([[4, 9], [10, 9], [7, 2]], m.fab); p.disc(11, 4, 2, m.fab2); p.line(2, 6, 5, 2, BLACK); }
  else if (s === 5) { p.line(4, py - 1, 9, 3, C('#8a6a4a')); p.line(10, py - 1, 5, 6, C('#5a5a62')); p.rect(6, 7, 3, 3, C('#b84a2a')); p.disc(9, 3, 1.4, C('#c8ccd4')); p.put(3, 10, C('#5a5a62')); }
  else if (s === 6) { blk(p, 4, 1, 6, py - 1, C('#f2f0ea')); p.line(5, 2, 5, py - 2, lv(C('#f2f0ea'), 3)); }
  else { for (let y = 2; y < py; y++) p.put(7 + Math.round(Math.sin(y * 0.8) * 3), y, lit ? lv(m.acc, 5) : lv(m.acc, 2)); for (let y = 2; y < py; y++) p.put(7 + Math.round(Math.cos(y * 0.8) * 3), y, lit ? C('#ff9ae0') : C('#6a3a5a')); if (lit) d.fx.disc(7, 9, 7, withAlpha(m.acc, 50)); p.hline(3, w - 4, py + 1, lit ? m.acc : DGREY); }
}

/** Bar: armário de bebidas → carrinho déco espelhado → carrinho de latão → bar de canto acolchoado → carrinho Memphis → carrinho de metal → carrinho preto fino → adega climatizada. */
function barcart(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const bottles = (x: number, yb: number, n: number) => { for (let i = 0; i < n; i++) { const c = [C('#3a6a3a'), C('#8a3a1a'), C('#d8c8a0'), C('#2a4a6a'), C('#c8a040')][(i + s) % 5]; const bh = 5 + (i % 2) * 2; p.rect(x + i * 3, yb - bh + 1, 2, bh, c); p.put(x + i * 3, yb - bh - 1, c); p.put(x + i * 3, yb - bh, lv(c, 4)); } };
  const glasses = (x: number, yb: number) => { for (let i = 0; i < 2; i++) { p.rect(x + i * 3, yb - 1, 2, 2, withAlpha(m.glass, 200)); p.put(x + i * 3, yb - 2, W); } };
  if (s === 0 || s === 3 || s === 7) {
    const c = s === 0 ? m.wood : s === 3 ? m.fab : C('#2a2c34');
    blk(p, 0, 4, w, h - 4, c);
    if (s === 0) { p.poly([[0, 4], [w / 2, 1], [w, 4]], m.wood2); p.rect(2, 6, w - 4, 8, lv(c, 0.8)); bottles(3, 13, 5); p.rect(2, 6, w - 4, 8, withAlpha(m.glass, 70)); p.vline(w >> 1, 6, 13, m.wood2); blk(p, 2, 15, w - 4, h - 17, lv(c, 2.4)); p.put(w >> 1, 17, m.metal); legs(d, 1, w - 2, h - 2); }
    else if (s === 3) { for (let y = 6; y < h - 2; y += 3) for (let x = 2 + (y % 2); x < w - 2; x += 4) p.put(x, y, lv(c, 1.4)); blk(p, -0, 2, w, 3, m.wood); bottles(2, 1, 4); glasses(15, 1); }
    else { p.rect(2, 6, w - 4, 12, lit ? C('#2a3a4a') : C('#14141a')); for (let y = 8; y < 18; y += 3) { p.hline(3, w - 4, y, C('#3a3c44')); for (let x = 4; x < w - 4; x += 3) p.put(x, y - 1, [C('#8a1a2a'), C('#3a5a2a'), C('#c8a040')][(x + y) % 3]); } p.hline(2, w - 3, 6, lit ? lv(m.acc, 5) : lv(m.acc, 2)); drawText(p, '12', 3, h - 3 - 4, lit ? m.acc : DGREY); glow(d, w / 2, 7, 6, m.acc); p.put(w - 4, h - 3, lit ? C('#48b85c') : DGREY); }
    return;
  }
  const fr = [0, m.metal, BRASS, 0, m.acc, GREY, m.metal, 0][s];
  for (const y of [8, 15]) { p.hline(0, w - 1, y, fr); p.rect(1, y + 1, w - 2, 1, s === 1 ? withAlpha(m.glass, 200) : s === 4 ? m.fab : lv(fr, 1.6)); }
  p.vline(1, 6, h - 3, fr); p.vline(w - 2, 6, h - 3, fr);
  if (s === 1) { p.line(w - 2, 6, w, 3, fr); } else if (s === 2) { p.line(w - 2, 6, w - 5, 3, fr); p.line(w - 5, 3, w - 1, 3, fr); } else p.hline(w - 4, w - 1, 6, fr);
  bottles(3, 7, 4); glasses(15, 7); bottles(4, 14, 2); p.ellipse(15, 13, 3, 1.5, s === 4 ? m.acc2 : C('#c8a868'));
  for (const x of [2, w - 3]) { p.disc(x, h - 1.5, 1.5, s === 4 ? m.acc2 : BLACK); p.put(x, h - 2, GREY); }
}

/** Piano: armário com castiçais → baby grand de lado → espineta → piano elétrico com caixa → teclado no suporte em X → piano digital → piano branco fino → piano com tela e luz nas teclas. */
function piano(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const keys = (x: number, y: number, kw: number, kh: number, lightUp = false) => { p.rect(x, y, kw, kh, W); for (let i = 0; i < kw; i += 2) p.put(x + i, y + kh - 1, lv(W, 2.6)); for (let i = 1; i < kw - 1; i += 3) p.vline(x + i, y, y + (kh >> 1), lightUp ? (i % 2 ? m.acc : C('#ff5ab0')) : BLACK); };
  if (s === 0 || s === 2) { // armário (vertical) / espineta
    const top = s === 0 ? 0 : 8, c = s === 0 ? m.wood2 : m.wood;
    blk(p, 1, top, w - 2, 20 - top, c);
    if (s === 0) { p.rect(5, 3, w - 10, 8, lv(c, 2.4)); for (let x = 7; x < w - 7; x += 3) p.vline(x, 4, 10, lv(c, 1.4)); for (const x of [3, w - 4]) { p.rect(x, 4, 1, 4, m.metal); p.put(x, 3, W); p.put(x, 2, GLOW); } }
    else { p.rect(4, 10, w - 8, 4, lv(c, 2.6)); p.hline(5, w - 6, 9, lv(c, 4)); books(p, 6, top - 1, 6, 4, 91, [W, PAPER]); }
    blk(p, 0, 19, w, 3, c); keys(2, 19, w - 4, 2); blk(p, 2, 22, w - 4, h - 26, lv(c, 2)); p.rect(w / 2 - 3, h - 4, 6, 1, m.metal);
    if (s === 0) legs(d, 2, w - 3, h - 4); else { p.vline(3, h - 4, h - 1, c); p.vline(w - 4, h - 4, h - 1, c); }
    return;
  }
  if (s === 1) { // baby grand de lado com tampa aberta
    const c = BLACK; p.line(4, 9, w - 5, 0, lv(c, 3)); p.line(4, 10, w - 5, 1, c); p.vline(w - 5, 1, 10, lv(c, 2)); blk(p, 0, 10, w, 7, c); p.hline(1, w - 2, 11, m.metal); keys(1, 12, 9, 2);
    for (const x of [2, w - 4]) { p.vline(x, 17, h - 2, c); p.vline(x + 1, 17, h - 2, lv(c, 2)); p.put(x, h - 1, m.metal); p.put(x + 1, h - 1, m.metal); } p.line(14, 17, 15, h - 6, m.metal); p.rect(12, h - 6, 6, 1, m.metal); return;
  }
  if (s === 3) { blk(p, 2, 10, w - 4, 8, C('#d8d0c0')); p.rect(3, 11, w - 6, 3, C('#2a2a2a')); keys(4, 12, w - 8, 2); p.rect(3, 15, w - 6, 2, C('#c8401a')); drawText(p, 'EP', 4, 15.5, W); for (const x of [4, w - 6]) { p.vline(x, 18, h - 1, CHROME); p.vline(x + 1, 18, h - 1, lv(CHROME, 2)); } blk(p, w / 2 - 4, h - 7, 8, 7, m.wood); p.disc(w / 2, h - 3.5, 2, C('#3a3a3a')); return; }
  if (s === 4) { blk(p, 0, 12, w, 5, C('#2a2a30')); keys(2, 14, w - 4, 2); p.rect(3, 12, 8, 2, lit ? C('#80f0a0') : C('#1a3a2a')); for (let i = 0; i < 6; i++) p.put(14 + i * 2, 13, lit ? m.acc : DGREY); p.line(5, 17, w - 6, h - 1, BLACK); p.line(w - 6, 17, 5, h - 1, BLACK); p.line(6, 17, w - 5, h - 1, lv(BLACK, 3)); glow(d, 7, 13, 4, C('#80f0a0')); return; }
  if (s === 5) { blk(p, 1, 9, w - 2, 9, m.wood2); p.rect(3, 10, 6, 2, lit ? C('#f08a30') : C('#4a3a2a')); keys(2, 13, w - 4, 3); blk(p, 2, 18, 2, h - 18, m.wood2); blk(p, w - 4, 18, 2, h - 18, m.wood2); p.hline(4, w - 5, h - 3, m.wood2); blk(p, w / 2 - 4, h - 3, 8, 2, BLACK); return; }
  if (s === 6) { blk(p, 1, 12, w - 2, 6, W); keys(2, 15, w - 4, 2); p.hline(2, w - 3, 13, lv(W, 2)); for (const x of [2, w - 3]) { p.vline(x, 18, h - 1, W); p.put(x, h - 1, lv(W, 2)); } p.hline(2, w - 3, h - 8, lv(W, 2.6)); return; }
  blk(p, 1, 12, w - 2, 6, C('#2a2c34')); keys(2, 15, w - 4, 2, lit); blk(p, w / 2 - 6, 4, 12, 8, C('#1a1a1e')); p.rect(w / 2 - 5, 5, 10, 6, lit ? C('#3a5ac8') : C('#14141a')); for (let i = 0; i < 4; i++) p.rect(w / 2 - 4 + i * 2, 9 - i, 1, 1 + i, lit ? m.acc : DGREY);
  blk(p, 2, 18, 3, h - 18, C('#2a2c34')); blk(p, w - 5, 18, 3, h - 18, C('#2a2c34')); p.hline(5, w - 6, h - 1, lit ? lv(m.acc, 5) : lv(m.acc, 2)); glow(d, w / 2, 8, 9, C('#6a8ae0'));
}

/** Tapete (no chão, em perspectiva): persa → déco geométrico → oval trançado → felpudo → Memphis → kilim → sisal → tapete com fio de luz. */
function rug(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const at = (x: number, y: number) => {
    const u = x / w, v = y / h, edge = x < 2 || x >= w - 2 || y === 0 || y === h - 1;
    switch (s) {
      case 0: return edge ? C('#d8b878') : (Math.abs(u - 0.5) * 4 + Math.abs(v - 0.5) * 2) < 0.6 ? C('#2a3a6a') : (x + y * 2) % 6 === 0 ? C('#d8b878') : C('#8a2a2a');
      case 1: return edge ? BLACK : (x % 8 < 4) === (y < h / 2) ? C('#e6dac0') : C('#2a7a7a');
      case 2: { const r = ((u - 0.5) * 2) ** 2 + ((v - 0.5) * 2) ** 2; return r > 1 ? 0 : C(['#c84a3a', '#e8d8b0', '#48a8a0', '#f0a0a8'][Math.floor(Math.sqrt(r) * 4) % 4]); }
      case 3: return y === 0 ? lv(C('#c8a060'), 4) : noise(x, y, 99) > 0.5 ? C('#c8a060') : C('#b08848');
      case 4: return edge ? BLACK : (x + y) % 7 === 0 ? C('#f0e040') : x % 12 < 6 ? C('#3ac0d0') : C('#e04898');
      case 5: return edge ? C('#3a2a20') : (Math.abs((x % 10) - 5) + Math.abs(y - h / 2)) < 3 ? C('#d8a030') : (x % 10 === 0 ? C('#3a6a3a') : C('#8a3a2a'));
      case 6: return (x + (y % 2)) % 2 ? C('#d8c8a0') : C('#c8b890');
      default: return edge ? (lit ? lv(m.acc, 5) : lv(m.acc, 2)) : (x % 6 === 0 ? C('#5a5c66') : C('#4c4e56'));
    }
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const skew = Math.round((h - 1 - y) * 0.5); // perspectiva: o fundo é mais estreito
    if (x < skew || x >= w - skew) continue;
    const c = at(x, y);
    if (c) p.put(x, y, c);
  }
  if (s === 0) for (let x = 0; x < w; x += 2) p.put(x, h - 1, C('#f0e8d0')); // franja
  if (s === 7) glow(d, w / 2, h / 2, 6, m.acc);
}

// ---------------------------------------------------------------- sobre a mesa

/** Abajur de mesa: Tiffany → leque déco → cone com pé de latão → luminária de lava → halógena articulada → cúpula de tecido → arco fino → lâmpada inteligente. */
function tablelamp(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1, cx = w / 2;
  if (s === 0) { for (let y = 1; y < 7; y++) { const r = 1 + y * 0.7; for (let x = Math.round(cx - r); x < cx + r; x++) p.put(x, y, [C('#3a8a5a'), C('#d8a030'), C('#a83a2a'), C('#3a6a9a')][(x + y * 2) % 4]); } if (lit) p.rect(1, 3, w - 2, 4, withAlpha(GLOW, 90)); p.hline(0, w - 1, 7, m.metal); p.vline(cx, 8, fl - 2, m.metal); p.poly([[cx - 3, fl + 1], [cx + 3, fl + 1], [cx + 1, fl - 2], [cx - 1, fl - 2]], m.metal); glow(d, cx, 6, 6); }
  else if (s === 1) { for (let i = 0; i < 5; i++) p.line(cx, 8, 1 + i * 2, 2, i % 2 ? lv(C('#f0e8d8'), lit ? 5 : 3) : C('#f0e8d8')); p.hline(1, w - 2, 1, m.metal); blk(p, cx - 1, 8, 2, fl - 9, BLACK); blk(p, 1, fl - 1, w - 2, 2, BLACK); p.hline(2, w - 3, fl - 1, m.metal); glow(d, cx, 5, 6); }
  else if (s === 2) { p.poly([[1, 7], [w - 1, 7], [cx + 1, 1], [cx - 1, 1]], m.acc); p.hline(1, w - 2, 7, lit ? BULB : lv(m.acc, 2)); p.line(cx, 8, cx - 2, fl - 1, BRASS); p.line(cx, 8, cx + 2, fl - 1, BRASS); p.disc(cx, fl - 0.5, 1, m.wood2); glow(d, cx, 8, 5); }
  else if (s === 3) { p.poly([[cx - 2, 1], [cx + 2, 1], [cx + 3, 9], [cx - 3, 9]], lit ? C('#f0a040') : C('#a8602a')); p.disc(cx - 0.5, 5, 1.3, lit ? C('#ff5a3a') : C('#8a2a1a')); p.disc(cx + 1, 3, 0.8, lit ? C('#ff5a3a') : C('#8a2a1a')); p.hline(cx - 2, cx + 1, 0, m.metal); p.poly([[cx - 3, 9], [cx + 3, 9], [cx + 4, fl + 1], [cx - 4, fl + 1]], m.metal); glow(d, cx, 5, 5, C('#ff7a3a')); }
  else if (s === 4) { blk(p, 1, fl - 1, 5, 2, BLACK); p.line(3, fl - 1, 2, 6, BLACK); p.line(2, 6, 7, 2, BLACK); p.poly([[6, 1], [9, 2], [9, 5], [6, 4]], m.acc2); p.put(8, 5, lit ? BULB : DGREY); glow(d, 8, 6, 5, BULB); }
  else if (s === 5) { p.poly([[1, 7], [w - 1, 7], [w - 2, 1], [2, 1]], lit ? lv(C('#e8dcc0'), 4.6) : C('#e8dcc0')); p.hline(1, w - 2, 7, lv(C('#e8dcc0'), 2)); p.ellipse(cx, fl - 3, 3, 3, m.fab2); p.vline(cx, 8, fl - 6, m.metal); p.hline(cx - 2, cx + 1, fl, lv(m.fab2, 1)); glow(d, cx, 7, 5); }
  else if (s === 6) { blk(p, 0, fl - 1, 5, 2, m.wood); p.line(2, fl - 1, 2, 4, m.metal); p.line(2, 4, 7, 1, m.metal); p.ellipse(8, 3, 1.5, 1.5, m.metal); p.put(8, 4, lit ? BULB : lv(m.metal, 3)); glow(d, 8, 5, 4, BULB); }
  else { ball(p, cx, 5, 3.5, lit ? C('#f8f0ff') : C('#c8ccd8')); if (lit) d.fx.disc(cx, 5, 3.5, withAlpha(C('#ff9ae0'), 80)); blk(p, cx - 2, 8, 4, 3, C('#d8dce4')); blk(p, cx - 3, fl - 3, 6, 4, C('#2a2c34')); p.hline(cx - 2, cx + 1, fl - 2, lit ? m.acc : DGREY); glow(d, cx, 5, 6, C('#ff9ae0')); }
}

/** Vasinho: violeta em cachepô de porcelana → cacto em vaso escalonado → espada-de-são-jorge em vaso de pés → hera pendente em vaso de barro → cacto colorido → bonsai → suculenta em cimento → vaso autoirrigável com sensor. */
function smallplant(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1;
  const pots: Col[] = [W, BLACK, C('#f0d040'), C('#b8603a'), m.acc2, C('#4a5a6a'), C('#b8b4ac'), C('#2a2c34')];
  const pot = pots[s], py = s === 3 ? 6 : 7;
  if (s === 0) { foliage(p, w / 2, 4, 4, 3, 101); for (const x of [3, 5, 7]) p.put(x, 3, C('#9a5ac8')); p.put(6, 2, C('#f0d040')); }
  else if (s === 1) { blk(p, 3, 1, 4, 7, C('#4a8a4a')); blk(p, 1, 3, 2, 3, C('#4a8a4a')); blk(p, 7, 2, 2, 3, C('#4a8a4a')); for (let y = 2; y < 7; y += 2) p.put(5, y, W); }
  else if (s === 2) { for (const [x, t] of [[3, 1], [5, 0], [7, 2]] as const) { p.rect(x, t, 2, py - t, C('#3a7a3a')); p.vline(x, t + 1, py - 1, C('#c8d070')); } }
  else if (s === 3) { foliage(p, w / 2, 3, 4, 2.5, 103); for (const x of [1, 8]) { p.vline(x, 5, fl - 1, LEAF); p.put(x, fl - 2, LEAF2); } }
  else if (s === 4) { p.ellipse(w / 2, 4, 2.5, 3.5, C('#48b85c')); p.disc(w / 2, 1, 1.2, C('#ff5ab0')); p.put(3, 4, W); }
  else if (s === 5) { p.line(5, py - 1, 4, 3, C('#6a4a2a')); p.line(4, 3, 7, 2, C('#6a4a2a')); foliage(p, 3, 2, 2.5, 1.5, 105); foliage(p, 7, 1.5, 2.5, 1.5, 106); }
  else if (s === 6) { for (const [x, y] of [[3, 5], [5, 4], [7, 5], [5, 6]] as const) p.ellipse(x, y, 1.6, 1.3, C('#8ab08a')); p.put(5, 4, lv(C('#8ab08a'), 4)); }
  else { foliage(p, w / 2, 3, 3.5, 3, 108); p.rect(1, py - 1, 1, 2, lit ? m.acc : DGREY); }
  const taper = s === 1 ? 0 : 1;
  p.poly([[1, py], [w - 1, py], [w - 1 - taper, fl + 1], [1 + taper, fl + 1]], pot); p.hline(1, w - 2, py, lv(pot, 4.4)); p.hline(1 + taper, w - 2 - taper, fl, lv(pot, 1.4));
  if (s === 0) { p.hline(2, w - 3, py + 2, C('#3a6ac8')); p.put(4, py + 3, C('#3a6ac8')); }
  if (s === 1) p.hline(1, w - 2, py + 2, m.metal);
  if (s === 7) { p.rect(w - 3, py + 1, 1, 2, lit ? C('#48b85c') : DGREY); glow(d, 1.5, py, 2.5, m.acc); }
}

/** Vaso de flores: vaso de opalina com lírios → vaso de cristal facetado com copo-de-leite → vaso pescoço fino → vaso de cerâmica rústica → vaso Memphis → girassóis no vaso de vidro → um galho num vaso de vidro → vaso com flores e luz. */
function vase(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1, cx = w / 2;
  const stem = (x0: number, x1: number, top: number) => p.line(x0, 7, x1, top, LEAF);
  const fl1 = (x: number, y: number, c: Col) => { p.put(x, y, c); p.put(x - 1, y, c); p.put(x + 1, y, c); p.put(x, y - 1, c); p.put(x, y, lv(c, 5)); };
  if (s === 0) { stem(3, 2, 1); stem(4, 5, 0); stem(5, 6, 2); fl1(2, 1, C('#f8f0f0')); fl1(5, 1, C('#f0a0c0')); fl1(6, 3, C('#f8f0f0')); p.ellipse(cx, 11, 3, 3, C('#9ac8b0')); p.rect(cx - 1, 7, 2, 2, C('#9ac8b0')); p.hline(cx - 2, cx + 1, 7, lv(C('#9ac8b0'), 4)); }
  else if (s === 1) { stem(3, 2, 2); stem(4, 5, 1); p.poly([[1, 2], [3, 1], [3, 4]], W); p.poly([[5, 1], [7, 0], [6, 3]], W); p.put(3, 3, C('#f0d040')); p.poly([[1, 7], [7, 7], [6, fl + 1], [2, fl + 1]], withAlpha(C('#c8d8e0'), 220)); for (let y = 8; y < fl; y += 2) p.put(2 + (y % 4 ? 0 : 3), y, W); p.hline(1, 6, 7, W); }
  else if (s === 2) { stem(4, 3, 0); stem(4, 6, 2); fl1(3, 0, RED); fl1(6, 2, C('#f0d040')); p.vline(3, 6, 8, m.acc); p.vline(4, 6, 8, m.acc); p.ellipse(cx, 11, 3.5, 2.5, m.acc); p.put(2, 10, lv(m.acc, 5)); }
  else if (s === 3) { foliage(p, cx, 3, 3.5, 3, 111, C('#a8862a'), C('#d8b040')); for (let i = 0; i < 3; i++) p.put(2 + i * 2, 2 + (i % 2), C('#c8501a')); p.poly([[1, 6], [7, 6], [8, 10], [6, fl + 1], [2, fl + 1], [0, 10]], C('#8a5a3a')); p.hline(1, 6, 9, C('#c8a060')); }
  else if (s === 4) { stem(4, 3, 1); fl1(3, 1, C('#f0e040')); p.poly([[1, 6], [7, 6], [4, fl + 1]], m.fab); p.rect(1, 6, 6, 3, m.fab2); for (let x = 2; x < 7; x += 2) p.put(x, 7, BLACK); }
  else if (s === 5) { stem(3, 2, 2); stem(4, 6, 1); for (const [x, y] of [[2, 2], [6, 1]] as const) { p.disc(x + 0.5, y + 0.5, 1.6, C('#f0c030')); p.put(x, y, C('#6a3a1a')); } p.rect(2, 7, 4, fl - 6, withAlpha(m.glass, 200)); p.hline(2, 5, 7, W); p.hline(2, 5, 10, withAlpha(LEAF, 200)); }
  else if (s === 6) { p.line(4, 7, 3, 1, C('#5a4a3a')); p.line(3, 3, 6, 0, C('#5a4a3a')); p.put(6, 0, LEAF2); p.put(2, 1, LEAF2); p.rect(3, 7, 2, fl - 6, withAlpha(m.glass, 220)); p.vline(3, 8, fl - 1, W); }
  else { stem(3, 2, 2); stem(4, 5, 1); fl1(2, 2, C('#f0a0e0')); fl1(5, 1, C('#a0c0ff')); blk(p, 2, 7, 4, fl - 6, C('#d8dce4')); p.hline(2, 5, fl, lit ? lv(m.acc, 5) : lv(m.acc, 2)); glow(d, cx, fl, 3, m.acc); }
}

/** Globo de mesa: globo em suporte de latão → globo déco com meridiano cromado → globo iluminado azul → globo de plástico laranja → globo inflável → globo de madeira → globo de arame → globo flutuante magnético com luz. */
function globe(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1, cx = w / 2, cy = 5.5, r = 4.5;
  const sea = [C('#c8b07a'), C('#5a8ab0'), lit ? C('#6ab0f0') : C('#3a7ac0'), C('#e88a30'), C('#3ac0d0'), C('#c8a070'), 0, C('#20304a')][s];
  const land = [C('#8a6a3a'), C('#d8c890'), C('#48b85c'), C('#f0d040'), C('#e04898'), C('#6a4a2a'), m.metal, lit ? m.acc : C('#3a6a7a')][s];
  if (s === 6) { p.ring(cx, cy, r, m.metal); p.vline(cx, cy - r, cy + r, m.metal); p.hline(cx - r, cx + r, cy, m.metal); p.ellipse(cx, cy, 2, r, 0); p.ring(cx, cy, 2.4, m.metal); }
  else {
    p.disc(cx, cy, r, sea);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (dd < r && noise(x >> 1, y >> 1, 121) > 0.55) p.put(x, y, land); }
    p.put(cx - 2, cy - 3, lv(sea, 5));
  }
  if (s === 0 || s === 1 || s === 5) { p.ring(cx, cy, r + 1, s === 1 ? CHROME : m.metal); p.put(cx - r - 1, cy, BLACK); }
  if (s === 7) { p.line(cx + r, cy, cx + 1, fl - 1, C('#2a2c34')); blk(p, cx - 3, fl - 1, 6, 2, C('#2a2c34')); p.hline(cx - 2, cx + 1, fl - 1, lit ? lv(m.acc, 5) : DGREY); glow(d, cx, cy, 6, m.acc); return; } // braço em arco até a base
  const sc = s === 0 || s === 5 ? m.wood2 : s === 1 ? CHROME : s === 3 ? C('#e88a30') : s === 4 ? m.acc : s === 6 ? m.metal : m.metal;
  p.vline(cx, cy + r, fl - 1, sc); blk(p, cx - 3, fl - 1, 6, 2, sc);
  if (s === 2) glow(d, cx, cy, 6, C('#9ad0ff'));
}

// ---------------------------------------------------------------- teto (fio até y = 0)

/** Lustre/pendente: lustre de cristal → lustre déco escalonado → sputnik → pendente laranja de globo → trilho de spots → luminária de papel → lâmpadas de filamento → anel de LED. */
function chandelier(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const cx = w >> 1;
  const cord = (y1: number, c: Col = DGREY) => { p.rect(cx - 2, 0, 4, 1, lv(c, 2)); p.vline(cx, 1, y1, c); };
  if (s === 0) { cord(4, m.metal); p.ellipse(cx, 9, 10, 3, m.metal); p.ellipse(cx, 8, 9, 1.5, lv(m.metal, 4)); for (let i = 0; i < 6; i++) { const x = 2 + i * 4; p.vline(x, 9, 13 + (i % 2) * 2, withAlpha(C('#e8f0f8'), 230)); p.put(x, 14 + (i % 2) * 2, W); p.rect(x - 1, 4, 2, 4, W); p.put(x - 1, 3, lit ? BULB : C('#c8b878')); } p.disc(cx, h - 2, 1.5, withAlpha(C('#e8f0f8'), 230)); glow(d, cx, 8, 11); }
  else if (s === 1) { cord(3, BLACK); for (let i = 0; i < 3; i++) { const ww = 8 + i * 6; blk(p, cx - ww / 2, 4 + i * 4, ww, 4, i % 2 ? m.metal : lit ? C('#fff0d0') : C('#e8dcc0')); } p.hline(cx - 9, cx + 9, 15, m.metal); p.poly([[cx - 2, 16], [cx + 2, 16], [cx, 19]], m.metal); glow(d, cx, 11, 11); }
  else if (s === 2) { cord(7, BRASS); ball(p, cx, 9, 2, BRASS); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const x = cx + Math.cos(a) * 10, y = 9 + Math.sin(a) * 6; p.line(cx, 9, x, y, BRASS); p.disc(x, y, 1, lit ? BULB : W); } glow(d, cx, 9, 11); }
  else if (s === 3) { cord(5, m.wood2); ball(p, cx, 11, 6, lit ? lv(m.fab, 4.6) : m.fab); p.hline(cx - 6, cx + 5, 11, lv(m.fab, 1.6)); p.ellipse(cx, 16, 3, 1, lit ? BULB : lv(m.fab, 1.4)); if (lit) d.fx.poly([[cx - 4, 17], [cx + 4, 17], [cx + 9, h + 4], [cx - 9, h + 4]], withAlpha(GLOW, 60)); glow(d, cx, 11, 9, C('#ffb060')); }
  else if (s === 4) { p.rect(1, 0, w - 2, 2, BLACK); p.hline(1, w - 2, 0, C('#3a3a42')); for (const x of [4, 12, 20]) { p.vline(x, 2, 4, BLACK); p.poly([[x - 2, 5], [x + 2, 5], [x + 3, 10], [x - 1, 10]], x === 12 ? m.acc : C('#2a2a30')); p.put(x + 1, 10, lit ? BULB : DGREY); if (lit) d.fx.poly([[x - 1, 11], [x + 3, 11], [x + 6, h + 4], [x - 2, h + 4]], withAlpha(BULB, 60)); } }
  else if (s === 5) { cord(3, W); p.disc(cx, 10, 7, lit ? C('#fff8e8') : C('#f2ece0')); for (let y = 5; y < 16; y += 2) p.hline(cx - Math.round(Math.sqrt(Math.max(0, 49 - (y - 10) ** 2))) + 1, cx + Math.round(Math.sqrt(Math.max(0, 49 - (y - 10) ** 2))) - 1, y, lv(C('#f2ece0'), 2.6)); glow(d, cx, 10, 10); }
  else if (s === 6) { p.rect(cx - 6, 0, 12, 1, m.metal); for (const [x, len] of [[cx - 5, 10], [cx, 14], [cx + 5, 8]] as const) { p.vline(x, 1, len, m.metal); p.rect(x - 1, len + 1, 2, 2, m.metal); p.ellipse(x, len + 5, 1.8, 2.5, withAlpha(C('#e8d8b0'), 220)); p.vline(x, len + 3, len + 6, lit ? C('#ffc040') : C('#8a6a2a')); if (lit) d.fx.disc(x, len + 5, 3.5, withAlpha(C('#ffc060'), 90)); } }
  else { p.vline(cx - 7, 0, 8, m.metal); p.vline(cx + 7, 0, 8, m.metal); p.ellipse(cx, 10, 11, 3, C('#2a2c34')); p.ellipse(cx, 10, 9, 1.5, lit ? lv(m.acc, 5) : lv(m.acc, 1.4)); p.ellipse(cx, 11, 9, 1, lit ? C('#f8f8ff') : C('#3a3c44')); if (lit) d.fx.ellipse(cx, 13, 11, 4, withAlpha(m.acc, 60)); }
}

/** Ventilador de teto: pás de vime → cromado déco → pás de madeira clara → pás de bambu com luminária → pás pretas finas → pás de pinho com lustre → pás brancas sem luz → pás com anel de LED. */
function ceilfan(d: Dc): void {
  const { p, s, m, lit, w } = d;
  const cx = w >> 1;
  const blade = [C('#c8a060'), m.metal, m.wood, C('#c8a868'), BLACK, m.wood, W, C('#d8dce4')][s];
  const motor = [m.wood2, m.metal, BRASS, m.wood2, BLACK, BRASS, W, C('#2a2c34')][s];
  p.rect(cx - 2, 0, 4, 1, lv(motor, 2)); p.vline(cx, 1, 3, motor);
  blk(p, cx - 3, 4, 6, 3, motor);
  const bl = s === 4 || s === 6 ? 12 : 11;
  blk(p, cx - 3 - bl, 5, bl, 2, blade); blk(p, cx + 3, 5, bl, 2, blade);
  p.ellipse(cx, 6, 2, 1, lv(blade, 2.6)); // pá de frente (encurtada)
  if (s === 0) for (let x = cx - 3 - bl; x < cx - 3; x += 2) p.put(x, 5, lv(blade, 1.6));
  if (s === 3 || s === 5) { p.ellipse(cx, 9, 3, 2, lit ? lv(C('#f0e0b0'), 5) : C('#f0e0b0')); glow(d, cx, 10, 6); }
  else if (s === 7) { p.hline(cx - 3, cx + 2, 7, lit ? lv(m.acc, 5) : lv(m.acc, 1.6)); glow(d, cx, 8, 6, m.acc); }
  else { p.vline(cx, 7, 9, motor); p.put(cx, 10, s === 1 ? m.metal : GREY); }
}

// ---------------------------------------------------------------- padrões (ladrilhos sem costura: tudo é função periódica de x, y)

const wrapD = (a: number, b: number, n: number): number => { const d = Math.abs(a - b) % n; return Math.min(d, n - d); };
const TAU = Math.PI * 2;
/** Papel de parede (16×16). */
function wallpaperAt(s: number, x: number, y: number): Col {
  switch (s) {
    case 0: { // nouveau: trepadeira dourada ondulante sobre verde-sálvia, com flor-de-lis
      const vy = 8 + 3.5 * Math.sin((x / 16) * TAU);
      if (Math.abs(y - vy) < 0.8) return C('#c8a050');
      if (wrapD(x, 4, 16) + wrapD(y, 3, 16) < 2) return C('#e8d0a0');
      if (wrapD(x, 12, 16) + wrapD(y, 13, 16) < 1.5) return C('#7a3a4a');
      return (x + y) % 5 === 0 ? C('#7a9a78') : C('#8aaa86');
    }
    case 1: { // déco: leques dourados sobre creme
      const dx = x - 7.5, dy = y - 15.5, r = Math.hypot(dx, dy);
      if (r < 8 && dy < 0) { if (Math.abs(r - 7) < 0.6 || Math.abs(r - 4.5) < 0.5) return C('#c8a040'); if (Math.abs(Math.atan2(dy, dx) % 0.5) < 0.12) return C('#d8b860'); return C('#e8dcc0'); }
      return y === 15 ? C('#c8a040') : C('#efe4ca');
    }
    case 2: { // anos 50: bumerangues e estrelinhas atômicas
      if (wrapD(x, 3, 16) + wrapD(y, 3, 16) < 1 || (wrapD(x, 3, 16) < 0.6 && wrapD(y, 3, 16) < 2.6) || (wrapD(y, 3, 16) < 0.6 && wrapD(x, 3, 16) < 2.6)) return C('#2a2a2a');
      const bx = (x - 11 + 16) % 16, by = (y - 10 + 16) % 16;
      if (by < 2 && bx < 6 - by * 2) return C('#e04848');
      if (bx < 2 && by < 6 && by >= 1) return C('#48a8a0');
      if (wrapD(x, 13, 16) < 0.6 && wrapD(y, 2, 16) < 0.6) return C('#f0a0a8');
      return C('#f4ecd0');
    }
    case 3: { // anos 70: círculos concêntricos em duas grades
      const r1 = Math.hypot(wrapD(x + 0.5, 8, 16), wrapD(y + 0.5, 8, 16)), r2 = Math.hypot(wrapD(x + 0.5, 0, 16), wrapD(y + 0.5, 0, 16));
      const r = Math.min(r1, r2);
      return [C('#4a2c18'), C('#d8782a'), C('#a8862a'), C('#f0c060')][Math.floor(r / 1.6) % 4];
    }
    case 4: { // anos 80: Memphis — rabisco, triângulo e confete
      if (Math.abs(y - (4 + Math.round(1.5 * Math.sin((x / 16) * TAU * 2)))) < 0.6) return C('#26262c');
      const tx = (x - 10 + 16) % 16, ty = (y - 9 + 16) % 16;
      if (ty < 5 && Math.abs(tx - 2.5) < ty / 2 + 0.3) return C('#3ac0d0');
      if (wrapD(x, 3, 16) < 1 && wrapD(y, 12, 16) < 1) return C('#e04898');
      if ((x * 7 + y * 3) % 23 === 0) return C('#f0e040');
      return C('#ecebf0');
    }
    case 5: { // anos 90: xadrez escocês verde e vinho
      const a = wrapD(x, 4, 16) < 2, b = wrapD(y, 4, 16) < 2, t = wrapD(x, 12, 16) < 0.6 || wrapD(y, 12, 16) < 0.6;
      if (t) return C('#d8a030');
      return a && b ? C('#5a2420') : a || b ? C('#7a3a2a') : (x + y) % 2 ? C('#2e4a34') : C('#365a3c');
    }
    case 6: return x % 8 === 0 ? C('#dcdad4') : C('#ecebe6'); // minimalista: risca de giz quase invisível
    default: { // casa inteligente: painel acústico 3D de hexágonos
      const hx = x % 8, hy = (y + (Math.floor(x / 8) % 2) * 8) % 16;
      if (hy === 0 || hx === 0) return C('#30323a');
      return hy < 6 && hx < 5 ? C('#5a5c66') : hy > 11 ? C('#3e4048') : C('#4c4e56');
    }
  }
}
/** Pintura e textura (16×16). */
function paintAt(s: number, x: number, y: number): Col {
  const n = noise(x, y, 141 + s);
  switch (s) {
    case 0: return n > 0.82 ? C('#d8c8a0') : n < 0.12 ? C('#c0b088') : C('#ccbc94'); // estuque
    case 1: return y === 12 ? C('#c8a040') : y === 13 ? C('#a8802a') : n > 0.9 ? C('#f4ecd8') : C('#ece2c8'); // marfim com filete
    case 2: return (x + y * 3) % 7 === 0 ? C('#a8d8c0') : C('#b8e0cc'); // verde-menta de rolo
    case 3: return x % 4 === 0 ? C('#3a2010') : x % 4 === 1 ? C('#8a5a30') : n > 0.7 ? C('#6a4024') : C('#7a4a28'); // lambri escuro
    case 4: return n > 0.93 ? C('#3ac0d0') : n < 0.05 ? C('#26262c') : n > 0.88 ? C('#f0e040') : C('#f0d0dc'); // respingado
    case 5: return mix(C('#c8784a'), C('#e0a070'), (Math.sin((x / 16) * TAU) + Math.cos((y / 16) * TAU * 2) + n) / 3 + 0.33); // esponjado terracota
    case 6: { const hole = wrapD(x, 4, 16) < 1 && (wrapD(y, 4, 8) < 1); return hole ? C('#8a8a86') : x === 0 || y === 0 ? C('#a8a6a0') : n > 0.8 ? C('#c4c2bc') : C('#bab8b2'); } // concreto aparente
    default: return x % 3 === 2 ? C('#3a2c22') : x % 3 === 0 ? C('#b08a64') : C('#9a7452'); // painel ripado
  }
}
/** Piso (16×16). */
function floorAt(s: number, x: number, y: number): Col {
  const n = noise(x, y, 171 + s);
  switch (s) {
    case 0: { // espinha de peixe
      const u = (x + y) % 16, v = (x - y + 32) % 16, a = Math.floor(u / 4) % 2 === 0;
      const edge = a ? u % 4 === 0 : v % 4 === 0;
      return edge ? C('#4a2c18') : a ? (n > 0.7 ? C('#9a6a3a') : C('#8a5a30')) : n > 0.7 ? C('#a8784a') : C('#b08050');
    }
    case 1: { const k = (Math.floor(x / 8) + Math.floor(y / 8)) % 2; const vein = Math.abs(((x + y * 0.6) % 8) - 4) < 0.4 && n > 0.4; return k ? (vein ? C('#3a3a40') : C('#1e1e24')) : vein ? C('#c8c4bc') : C('#ece8e0'); } // xadrez de mármore
    case 2: { const g = x % 8 === 0 || y % 8 === 0; return g ? C('#8a8070') : n > 0.85 ? C('#e04848') : n < 0.1 ? C('#48a8a0') : C('#e8e0c8'); } // linóleo salpicado
    case 3: return n > 0.66 ? C('#e09040') : n < 0.3 ? C('#a8602a') : C('#c8782a'); // carpete felpudo
    case 4: return n > 0.94 ? C('#e04898') : n > 0.88 ? C('#3ac0d0') : n < 0.06 ? C('#26262c') : n < 0.1 ? C('#f0e040') : C('#d8d4dc'); // granilite
    case 5: { const row = Math.floor(y / 4), seam = (x + row * 6) % 16 === 0 || y % 4 === 0; return seam ? C('#7a5a34') : (x + row) % 5 === 0 ? C('#b89060') : C('#c8a070'); } // laminado
    case 6: return x === 0 || y === 0 ? C('#a8a49c') : n > 0.9 ? C('#d0ccc4') : C('#c4c0b8'); // cimento queimado
    default: return x === 0 || y === 0 ? C('#4a4a52') : (x + y) % 9 === 0 ? C('#9a9aa4') : C('#7a7a84'); // porcelanato grande
  }
}
const TILE: Record<string, (s: number, x: number, y: number) => Col> = { wallpaper: wallpaperAt, paint: paintAt, floor: floorAt };

// ---------------------------------------------------------------- janela (o vão DWIN fica livre: a vista da cidade aparece)

/** Cortina: drapeado de veludo → cetim plissado com bandô → tecido tropical → estampa geométrica → persiana vertical → romana → voal → rolô motorizado. */
function curtain(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const { x: wx, w: ww } = DWIN;
  const rod = [BRASS, m.metal, m.wood2, m.wood, CHROME, m.wood, BLACK, C('#d8dce4')][s];
  const panel = (x0: number, x1: number, y0: number, c: Col, tie: number | null, pattern?: (x: number, y: number) => Col | 0) => {
    for (let y = y0; y < h; y++) {
      let a = x0, b = x1;
      if (tie !== null && y > tie - 6 && y < tie + 6) { const k = 1 - Math.abs(y - tie) / 6; if (x0 === 0) b = Math.round(x1 - k * (x1 - 2)); else a = Math.round(x0 + k * (w - 3 - x0)); }
      for (let x = a; x <= b; x++) { const pc = pattern?.(x, y); p.set(x, y, pc ? pc : (x - a) % 3 === 0 ? lv(c, 1.8) : (x - a) % 3 === 1 ? lv(c, 3.8) : c); }
    }
  };
  // suporte na parede e varão
  p.rect(1, 0, 2, 3, rod); p.rect(w - 3, 0, 2, 3, rod); p.hline(0, w - 1, 2, rod); p.hline(0, w - 1, 1, lv(rod, 4.2));
  if (s === 0) { p.disc(0.5, 2, 1.5, rod); p.disc(w - 0.5, 2, 1.5, rod); panel(0, 7, 3, m.fab, 24); panel(w - 8, w - 1, 3, m.fab, 24); for (let x = 3; x < w - 3; x++) p.set(x, 3 + Math.round(3 * Math.abs(Math.sin(((x - 3) / (w - 6)) * Math.PI * 2))), lv(m.fab, 1.6)); for (let x = 3; x < w - 3; x++) for (let y = 3; y < 3 + Math.round(3 * Math.abs(Math.sin(((x - 3) / (w - 6)) * Math.PI * 2))); y++) p.set(x, y, m.fab); for (const x of [3, w - 4]) { p.rect(x - 1, 24, 2, 1, GOLD); p.vline(x, 25, 28, GOLD); p.put(x, 29, lv(GOLD, 1.6)); } }
  else if (s === 1) { panel(0, 6, 3, m.fab, null); panel(w - 7, w - 1, 3, m.fab, null); blk(p, 0, 3, w, 5, BLACK); for (let x = 2; x < w - 2; x += 4) p.poly([[x, 7], [x + 2, 4], [x + 4, 7]], m.metal); p.hline(0, w - 1, 7, m.metal); }
  else if (s === 2) { const pat = (x: number, y: number): Col | 0 => ((x * 3 + y * 5) % 11 === 0 ? C('#3c8a3c') : (x + y * 2) % 13 === 0 ? C('#f0a0a8') : 0); panel(0, 7, 3, m.fab, 22, pat); panel(w - 8, w - 1, 3, m.fab, 22, pat); }
  else if (s === 3) { const pat = (x: number, y: number): Col | 0 => (Math.floor(y / 4) % 2 === (Math.floor(x / 4) % 2) ? C('#4a2c18') : (y % 4 === 0 ? C('#f0c060') : 0)); panel(0, 7, 3, m.fab, null, pat); panel(w - 8, w - 1, 3, m.fab, null, pat); for (let x = 1; x < w; x += 3) p.put(x, 3, lv(rod, 1.6)); }
  else if (s === 4) { blk(p, 0, 3, w, 3, m.wood); p.hline(0, w - 1, 4, m.fab2); for (const [x0, n] of [[0, 4], [w - 8, 4]] as const) for (let i = 0; i < n; i++) { const c = [m.fab, m.fab2, m.acc, C('#ecebf0')][i % 4]; p.rect(x0 + i * 2, 6, 2, h - 7, c); p.vline(x0 + i * 2, 6, h - 2, lv(c, 4)); } }
  else if (s === 5) { blk(p, wx - 2, 3, ww + 4, 9, m.fab2); for (let y = 5; y < 12; y += 3) p.hline(wx - 2, wx + ww + 1, y, lv(m.fab2, 1.6)); p.hline(wx - 2, wx + ww + 1, 11, lv(m.fab2, 1.2)); p.vline(w / 2, 12, 16, PAPER); p.put(w / 2, 17, m.wood); }
  else if (s === 6) { const sheer = withAlpha(W, 150); for (const [a, b] of [[0, 9], [w - 10, w - 1]] as const) for (let y = 3; y < h; y++) for (let x = a; x <= b; x++) p.set(x, y, (x % 3 === 0) ? withAlpha(lv(W, 2.6), 170) : sheer); }
  else { blk(p, 0, 2, w, 4, C('#e8eaee')); p.rect(wx - 1, 6, ww + 2, 8, C('#3a3c44')); p.hline(wx - 1, wx + ww, 13, C('#2a2c34')); p.rect(w - 4, 3, 2, 2, lit ? m.acc : DGREY); glow(d, w - 3, 4, 3, m.acc); }
}

/** Moldura da janela: bandeira de vitral → caixilho déco com raios → venezianas abertas e floreira → madeira com vaso de macramê → blocos de vidro → PVC branco com vaso → grade fina de aço → vidro inteligente com faixa de tela. */
function winframe(d: Dc): void {
  const { p, s, m, lit, w } = d;
  const { x: wx, y: wy, w: ww, h: wh } = DWIN;
  const fr = [m.wood, BLACK, W, m.wood, C('#f0d0dc'), W, BLACK, C('#2a2c34')][s];
  const t = s === 6 || s === 7 ? 1 : 2;
  // moldura em volta do vão
  blk(p, wx - t, wy - t, ww + 2 * t, t, fr); blk(p, wx - t, wy + wh, ww + 2 * t, t, fr); blk(p, wx - t, wy, t, wh, fr); blk(p, wx + ww, wy, t, wh, fr);
  // peitoril
  blk(p, wx - t - 2, wy + wh + t, ww + 2 * t + 4, 2, s === 4 ? m.fab2 : lv(fr, 2.6));
  if (s === 0) { p.poly([[wx - 3, wy - 2], [w / 2, 0], [wx + ww + 2, wy - 2]], m.wood2); p.put(w / 2, 1, m.metal); for (let x = wx; x < wx + ww; x++) for (let y = wy; y < wy + 7; y++) p.set(x, y, withAlpha([C('#c83a32'), C('#3a8a5a'), C('#d8a030'), C('#3a6ac8')][(Math.floor(x / 3) + Math.floor(y / 3)) % 4], 150)); p.hline(wx, wx + ww - 1, wy + 7, m.wood2); p.vline(w / 2, wy + 7, wy + wh - 1, m.wood2); }
  else if (s === 1) { for (let i = 0; i < 5; i++) p.line(w / 2, wy + 9, wx + i * (ww / 4), wy, m.metal); p.hline(wx, wx + ww - 1, wy + 9, m.metal); p.vline(w / 2, wy + 9, wy + wh - 1, BLACK); }
  else if (s === 2) { for (const x0 of [0, wx + ww + t]) { blk(p, x0, wy - t, wx - t, wh + 2 * t, m.acc); for (let y = wy; y < wy + wh; y += 2) p.hline(x0 + 1, x0 + wx - t - 2, y, lv(m.acc, 1.6)); } blk(p, wx - 1, wy + wh + t + 2, ww + 2, 3, m.wood); for (let x = wx; x < wx + ww; x += 3) { p.put(x, wy + wh + t + 1, x % 2 ? RED : C('#f0d040')); p.put(x + 1, wy + wh + t + 1, LEAF); } p.vline(w / 2, wy, wy + wh - 1, W); }
  else if (s === 3) { p.vline(w / 2, wy, wy + wh - 1, fr); p.vline(wx + 4, wy, wy + 8, C('#c8a060')); p.line(wx + 4, wy + 8, wx + 1, wy + 12, C('#c8a060')); p.line(wx + 4, wy + 8, wx + 7, wy + 12, C('#c8a060')); blk(p, wx + 1, wy + 12, 7, 4, C('#a8401a')); foliage(p, wx + 4, wy + 12, 4, 2, 151, C('#5a7a2a'), C('#7a9a3a')); for (let i = 0; i < 4; i++) p.vline(wx + 2 + i * 2, wy + 15, wy + 19 + (i % 2) * 2, LEAF); }
  else if (s === 4) { for (const x0 of [0, wx + ww + t]) for (let y = wy - t; y < wy + wh + t; y += 4) for (let x = x0; x < x0 + wx - t; x += 4) { p.rect(x, y, 3, 3, withAlpha(C('#b8d8f0'), 220)); p.put(x, y, W); p.hline(x, x + 3, y + 3, C('#8a9ab0')); p.vline(x + 3, y, y + 3, C('#8a9ab0')); } }
  else if (s === 5) { p.vline(w / 2, wy, wy + wh - 1, W); p.hline(wx, wx + ww - 1, wy + 11, W); p.rect(w / 2 + 2, wy + 15, 1, 3, GREY); blk(p, wx + ww - 6, wy + wh - 4, 4, 4, C('#b8603a')); foliage(p, wx + ww - 4, wy + wh - 6, 3, 2.5, 153); }
  else if (s === 6) { for (let x = wx + 6; x < wx + ww; x += 6) p.vline(x, wy, wy + wh - 1, BLACK); for (let y = wy + 7; y < wy + wh; y += 7) p.hline(wx, wx + ww - 1, y, BLACK); }
  else { p.rect(wx, wy + wh - 4, ww, 4, C('#1a1a1e')); drawText(p, '22', wx + 1, wy + wh - 4.5, lit ? m.acc : DGREY); p.hline(wx + 10, wx + ww - 2, wy + wh - 2, lit ? lv(m.acc, 5) : DGREY); for (let x = wx; x < wx + ww; x++) p.set(x, wy, withAlpha(C('#30404c'), 90)); glow(d, wx + 6, wy + wh - 2, 4, m.acc); }
}

// ---------------------------------------------------------------- letreiros (com o nome do selo)

/** Escreve o nome ajustado à largura: tenta escala 2, cai para 1 e abrevia sem cortar palavra. */
function nameIn(p: Px, name: string, x: number, y: number, mw: number, mh: number, c: Col, sh?: Col): void {
  const sc = textWidth(name, 2) <= mw && mh >= 10 ? 2 : 1;
  const t = sc === 2 ? name : abbrText(name, mw, 1);
  const tw = textWidth(t, sc), tx = x + Math.floor((mw - tw) / 2), ty = y + Math.floor((mh - 5 * sc) / 2);
  if (sh) drawText(p, t, tx + 1, ty + 1, sh, sc);
  drawText(p, t, tx, ty, c, sc);
}
/** Letreiro da fachada: tabuleta pintada → vidro negro com letras douradas → neon de caixa → caixa luminosa → neon sobre grade → placa de alumínio com refletores → letras de aço soltas → painel de LED. */
function sign(d: Dc): void {
  const { p, s, m, lit, w, h, name } = d;
  const neon = (c: Col) => (lit ? lv(c, 5) : lv(c, 2.2));
  if (s === 0) { for (const x of [6, w - 7]) { p.vline(x, 0, 3, GREY); p.put(x, 0, BLACK); } blk(p, 0, 3, w, h - 3, m.wood); p.rect(2, 5, w - 4, h - 7, lv(m.wood, 1.6)); for (const x of [1, w - 2]) p.put(x, 4, m.metal); nameIn(p, name, 3, 5, w - 6, h - 7, GOLD, lv(m.wood, 1)); }
  else if (s === 1) { blk(p, 4, 0, w - 8, h, BLACK); p.poly([[0, 4], [4, 0], [4, h], [0, h - 4]], m.metal); p.poly([[w, 4], [w - 4, 0], [w - 4, h], [w, h - 4]], m.metal); p.hline(5, w - 6, 2, m.metal); p.hline(5, w - 6, h - 3, m.metal); nameIn(p, name, 5, 3, w - 10, h - 6, GOLD); }
  else if (s === 2) { blk(p, 0, 2, w, h - 2, C('#2a2a30')); for (const x of [8, w - 9]) p.rect(x, 0, 1, 2, GREY); nameIn(p, name, 2, 3, w - 4, h - 5, neon(C('#ff6a8a'))); p.ring(w - 5, 6, 2, neon(C('#6ae0ff'))); if (lit) { d.fx.rect(1, 3, w - 2, h - 5, withAlpha(C('#ff6a8a'), 40)); } }
  else if (s === 3) { blk(p, 0, 1, w, h - 1, m.wood2); p.rect(2, 3, w - 4, h - 5, lit ? C('#f8e8c0') : C('#d8c8a0')); p.rect(2, 3, w - 4, 2, m.fab); p.rect(2, h - 4, w - 4, 2, m.fab); nameIn(p, name, 3, 5, w - 6, h - 9, m.wood2); glow(d, w / 2, h / 2, 12, C('#fff0c0')); p.vline(w >> 1, 0, 0, GREY); }
  else if (s === 4) { blk(p, 0, 2, w, h - 2, BLACK); for (let x = 2; x < w - 2; x += 4) p.vline(x, 3, h - 2, C('#1a1a30')); p.hline(1, w - 2, 3, neon(C('#3ac0d0'))); p.hline(1, w - 2, h - 2, neon(C('#3ac0d0'))); nameIn(p, name, 2, 4, w - 4, h - 6, neon(C('#ff5ab0'))); p.vline(w >> 1, 0, 1, GREY); if (lit) d.fx.rect(0, 2, w, h - 2, withAlpha(C('#ff5ab0'), 35)); }
  else if (s === 5) { for (const x of [10, w - 11]) { p.line(x, 0, x + 2, 3, DGREY); p.rect(x + 1, 3, 3, 1, DGREY); if (lit) d.fx.poly([[x, 4], [x + 5, 4], [x + 9, h], [x - 4, h]], withAlpha(BULB, 60)); } blk(p, 0, 5, w, h - 5, C('#c8ccd4')); nameIn(p, name, 2, 5, w - 4, h - 5, m.fab, undefined); }
  else if (s === 6) { nameIn(p, name, 0, 2, w, h - 2, C('#b8bcc4'), C('#5a5c64')); }
  else { blk(p, 0, 1, w, h - 1, C('#14141a')); for (let y = 3; y < h - 1; y += 2) for (let x = 2; x < w - 1; x += 2) p.put(x, y, C('#1e1e26')); nameIn(p, name, 2, 3, w - 4, h - 4, lit ? m.acc : lv(m.acc, 1.6)); glow(d, w / 2, h / 2, 10, m.acc); p.vline(w >> 1, 0, 0, GREY); }
}

/** Placa com o logo (parede interna): oval de latão gravado → distintivo cromado com asas → bumerangue → madeira com círculos → triângulo neon → disco de acrílico → placa branca → acrílico com borda de LED. */
function logo(d: Dc): void {
  const { p, s, m, lit, w, h, name } = d;
  const ini = (name.trim()[0] ?? 'S').toUpperCase();
  const mark = (cx: number, cy: number, c: Col) => drawText(p, ini, cx - 1, cy - 2, c);
  const label = (y: number, c: Col, x0 = 2, x1 = w - 2) => nameIn(p, name, x0, y, x1 - x0, 7, c);
  if (s === 0) { hang(p, w >> 1, 6, w - 7, 3); p.ellipse(w / 2, 12.5, w / 2 - 0.5, 9, BRASS); p.ellipse(w / 2, 12.5, w / 2 - 2.5, 7, lv(BRASS, 3.2)); p.ellipse(w / 2, 9, 3, 3, BRASS); mark(w / 2, 9, C('#4a2a10')); label(13, C('#4a2a10'), 5, w - 5); }
  else if (s === 1) { p.put(w >> 1, 0, GREY); p.poly([[0, 7], [12, 4], [12, 12]], m.metal); p.poly([[w, 7], [w - 12, 4], [w - 12, 12]], m.metal); for (let i = 0; i < 3; i++) { p.hline(2 + i * 3, 11, 6 + i * 2, lv(m.metal, 2)); p.hline(w - 12, w - 3 - i * 3, 6 + i * 2, lv(m.metal, 2)); } p.disc(w / 2, 8, 6, BLACK); p.ring(w / 2, 8, 6, m.metal); mark(w / 2, 8, m.metal); blk(p, 3, 14, w - 6, 8, BLACK); label(14, m.metal, 4, w - 4); }
  else if (s === 2) { p.put(w >> 1, 0, GREY); p.poly([[2, 4], [w - 4, 1], [w - 1, 6], [w / 2, 9], [w - 2, 18], [3, 21], [0, 15], [w / 2 - 4, 11]], m.acc); p.poly([[5, 6], [w - 6, 4], [w - 4, 7], [w / 2, 10], [6, 9]], C('#f4ecd0')); label(4, m.acc, 6, w - 6); p.disc(8, 16, 2.5, m.acc2); mark(8.5, 16, BLACK); }
  else if (s === 3) { hang(p, w >> 1, 5, w - 6, 3); blk(p, 0, 3, w, h - 3, m.wood); for (let i = 0; i < 3; i++) p.disc(7 + i * 3, 10, 5 - i, [m.fab, m.fab2, C('#f0c060')][i]); mark(9, 10, m.wood2); label(14, C('#f0e0b0')); }
  else if (s === 4) { p.put(w >> 1, 0, GREY); p.rect(0, 1, w, h - 1, BLACK); const c = lit ? lv(C('#ff5ab0'), 5) : lv(C('#ff5ab0'), 2.2); p.line(4, h - 9, 11, 3, c); p.line(11, 3, 18, h - 9, c); p.hline(4, 18, h - 9, c); mark(11, 9, lit ? lv(C('#3ac0d0'), 5) : lv(C('#3ac0d0'), 2)); label(h - 8, lit ? lv(C('#3ac0d0'), 5) : lv(C('#3ac0d0'), 2), 20, w - 1); glow(d, 11, 8, 8, C('#ff5ab0')); }
  else if (s === 5) { for (const x of [2, w - 3]) p.put(x, 2, GREY); p.rect(0, 1, w, h - 1, withAlpha(C('#d8e8f0'), 200)); p.hline(0, w - 1, 1, W); p.disc(9, 11, 6, C('#c8ccd8')); p.disc(9, 11, 1.4, withAlpha(C('#d8e8f0'), 200)); p.line(5, 8, 12, 14, C('#f0a0e0')); mark(9, 5, C('#2a3a6a')); label(8, C('#2a3a6a'), 17, w - 1); }
  else if (s === 6) { for (const x of [2, w - 3]) p.put(x, 3, GREY); blk(p, 0, 2, w, h - 4, W); p.rect(4, 6, 6, 6, BLACK); drawText(p, ini, 6, 6.5, W); label(7, BLACK, 12, w - 2); p.hline(12, w - 4, 15, m.acc2); }
  else { p.put(w >> 1, 0, GREY); p.rect(0, 1, w, h - 1, withAlpha(C('#30404c'), 210)); p.hline(0, w - 1, 1, lit ? lv(m.acc, 5) : lv(m.acc, 2)); p.hline(0, w - 1, h - 1, lit ? lv(m.acc, 5) : lv(m.acc, 2)); p.disc(8, 11, 5, lit ? m.acc : lv(m.acc, 1.6)); mark(8, 11, C('#14141a')); label(8, lit ? W : CHROME, 15, w - 1); glow(d, w / 2, h / 2, 12, m.acc); }
}

// ---------------------------------------------------------------- montagem

const DRAW: Record<string, (d: Dc) => void> = {
  poster, painting, goldrec, clock, wallmirror, wallshelf, sofa, armchair, bookcase, jukebox, aquarium, bigplant, floorlamp, coffeetable,
  stereo, sculpture, barcart, piano, rug, tablelamp, smallplant, vase, globe, chandelier, ceilfan, curtain, winframe, sign, logo,
};
/** Margem em volta do desenho (contorno de 1 px + brilho). */
export const DPAD = 2;
export type DCond = 'new' | 'used';
export interface DecoOpts { cond?: DCond; lit?: boolean; /** nome do selo (letreiros e placas) */ name?: string }
const hashS = (s: string): number => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };

/**
 * Desgaste de "usado/vintage": cor desbota para o sépia e escurece um pouco, aparecem riscos claros e manchas escuras
 * (determinísticos pela semente). Só mexe em pixels opacos: a silhueta não muda.
 */
function wear(p: Px, seed: number): void {
  const sep = C('#a89070');
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = y * p.w + x, c = p.d[i];
    if (c >>> 24 < 40) continue;
    const [r, g, b, a] = rgba(c);
    const gr = (r * 0.3 + g * 0.59 + b * 0.11) | 0;
    let o = mix(pack(Math.round(r * 0.55 + gr * 0.45), Math.round(g * 0.55 + gr * 0.45), Math.round(b * 0.55 + gr * 0.45), a), sep, 0.22);
    o = mix(o, C('#1e1814'), 0.08);
    const n = noise(x, y, seed);
    if (n > 0.95) o = mix(o, C('#f0e8d8'), 0.35); // risco
    else if (n < 0.04) o = mix(o, C('#3a2a1a'), 0.3); // mancha
    if ((x + seed) % 13 === 0 && noise(x, 0, seed + 1) > 0.6 && y > p.h * 0.3 && y < p.h * 0.7) o = mix(o, C('#f0e8d8'), 0.25); // arranhão vertical
    p.d[i] = withAlpha(o, a);
  }
}

const cacheD = new Map<string, Px>();
/** O item pronto (com margem DPAD): desenha, desgasta se usado, contorna (INK) e cola a luz. Tamanho fixo por item. */
export function decoPx(id: string, sty: DSty | number, o: DecoOpts = {}): Px {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`deco31px: sem desenho para '${id}'`);
  const s = styIx(sty);
  const cond = o.cond ?? 'new', lit = !!(def.light && o.lit), name = def.label ? (o.name ?? 'Selo') : '';
  const key = `${id}|${s}|${cond}|${lit ? 1 : 0}|${name}`;
  const hit = cacheD.get(key);
  if (hit) return hit;
  if (def.tile) { const t = decoTilePx(id, s, cond); cacheD.set(key, t); return t; }
  const layer = new Px(def.w, def.h), fx = new Px(def.w, def.h);
  DRAW[id]({ p: layer, fx, s, m: M[s], lit, w: def.w, h: def.h, name });
  if (cond === 'used') wear(layer, hashS(id) + s * 17);
  const out = new Px(def.w + 2 * DPAD, def.h + 2 * DPAD);
  out.blit(layer, DPAD, DPAD);
  out.outline(INK);
  out.blit(fx, DPAD, DPAD);
  if (cacheD.size > 1500) cacheD.clear();
  cacheD.set(key, out);
  return out;
}
/** Tamanho final do Px de um item (igual em todos os estilos e estados). Padrões: o ladrilho, sem margem. */
export const decoSize = (id: string): { w: number; h: number } => { const d = BY_ID.get(id)!; return d.tile ? { w: d.w, h: d.h } : { w: d.w + 2 * DPAD, h: d.h + 2 * DPAD }; };
/** O item existe nesse estilo? */
export const decoHas = (id: string, sty: DSty | number): boolean => !!BY_ID.get(id)?.sty.includes(styIx(sty));

/** Ladrilho de um padrão (papel de parede, pintura, piso): repete sem costura. */
export function decoTilePx(id: string, sty: DSty | number, cond: DCond = 'new'): Px {
  const def = BY_ID.get(id)!, f = TILE[id], s = styIx(sty);
  const t = new Px(def.w, def.h);
  for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) t.d[y * def.w + x] = f(s, x, y) | 0xff000000;
  if (cond === 'used') wear(t, hashS(id) + s * 17);
  return t;
}
/** Área W × H coberta pelo padrão, a partir da origem (ox, oy) do mundo (para casar com a área vizinha). */
export function decoFillPx(id: string, sty: DSty | number, W: number, H: number, cond: DCond = 'new', ox = 0, oy = 0): Px {
  const t = decoTilePx(id, sty, cond), out = new Px(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out.d[y * W + x] = t.d[(((y + oy) % t.h) + t.h) % t.h * t.w + ((((x + ox) % t.w) + t.w) % t.w)];
  return out;
}

// ---------------------------------------------------------------- upgrades dos itens obrigatórios (6 épocas × níveis)

export interface UpgArt { id: string; w: number; h: number; mount: 'floor' | 'desk'; levels: { pt: string; en: string }[]; pt: string; en: string }
const L3 = (a: string, b: string, c: string, ea: string, eb: string, ec: string) => [{ pt: a, en: ea }, { pt: b, en: eb }, { pt: c, en: ec }];
export const UPG_ART: UpgArt[] = [
  { id: 'phone', w: 22, h: 16, mount: 'desk', pt: 'Telefone', en: 'Telephone', levels: L3('Uma linha', 'Várias linhas', 'Central do executivo', 'One line', 'Multi-line', 'Executive console') },
  { id: 'filing', w: 16, h: 32, mount: 'floor', pt: 'Arquivo de aço', en: 'Filing cabinet', levels: L3('2 gavetas', '4 gavetas', '5 gavetas com tranca', '2 drawers', '4 drawers', '5 drawers, locking bar') },
  { id: 'mixer', w: 50, h: 28, mount: 'floor', pt: 'Mesa de som', en: 'Mixing desk', levels: L3('4 canais', '8 canais', '24 canais', '4 channels', '8 channels', '24 channels') },
  { id: 'safe', w: 24, h: 28, mount: 'floor', pt: 'Cofre', en: 'Safe', levels: L3('Caixa-forte pequena', 'Cofre de segredo', 'Porta de casa-forte', 'Small strongbox', 'Combination safe', 'Vault door') },
  { id: 'ledger', w: 24, h: 12, mount: 'desk', pt: 'Livro-caixa', en: 'Ledger', levels: L3('Caderno', 'Livro encadernado', 'Livro e máquina de contas', 'Notebook', 'Bound ledger', 'Ledger and calculator') },
  { id: 'mic', w: 14, h: 34, mount: 'floor', pt: 'Microfone do estúdio', en: 'Studio microphone', levels: L3('Microfone simples', 'Microfone de fita/condensador', 'Válvula com tela antipop', 'Basic mic', 'Ribbon/condenser mic', 'Tube mic with pop filter') },
];
export const UPG_IDS = UPG_ART.map((u) => u.id);
const UPG = new Map(UPG_ART.map((u) => [u.id, u]));
export const upgArt = (id: string): UpgArt | undefined => UPG.get(id);

interface Uc { p: Px; fx: Px; e: number; l: number; w: number; h: number }
/** Cor-base de cada época (0..5) para as máquinas. */
const ERA_BODY = [C('#4a2c1a'), C('#1e1c22'), C('#7a7e88'), C('#c8b890'), C('#3a3a42'), C('#d8dce4')];
const ERA_TRIM = [BRASS, CHROME, CHROME, C('#e08a30'), C('#e04848'), C('#5ae0ff')];

/** Telefone: aparelho da época; nível 2 ganha botões de linha acesos; nível 3 vira central com intercomunicador e dourado. */
function uPhone(u: Uc): void {
  const { p, e, l, h } = u, body = ERA_BODY[e], trim = l === 3 ? GOLD : ERA_TRIM[e], fl = h - 1;
  const set0 = 0;
  if (e === 0) { blk(p, set0 + 2, fl - 1, 7, 2, body); p.vline(set0 + 5, 3, fl - 2, body); p.vline(set0 + 6, 3, fl - 2, lv(body, 2.4)); p.poly([[set0 + 3, 1], [set0 + 8, 1], [set0 + 7, 4], [set0 + 4, 4]], body); p.hline(set0 + 3, set0 + 7, 1, trim); p.line(set0 + 8, 6, set0 + 10, 9, trim); p.rect(set0 + 9, 9, 2, 3, body); }
  else if (e <= 2) { const c = e === 1 ? body : C('#2a2a2e'); p.ellipse(set0 + 6, fl - 3, 5.5, 3.5, c); p.disc(set0 + 6, fl - 3, 2.4, e === 2 ? C('#e8e4dc') : trim); p.disc(set0 + 6, fl - 3, 1, c); blk(p, set0, fl - 9, 12, 3, c); p.rect(set0 + 1, fl - 7, 2, 2, c); p.rect(set0 + 9, fl - 7, 2, 2, c); }
  else if (e === 3) { blk(p, set0, fl - 6, 12, 7, body); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.rect(set0 + 2 + i * 3, fl - 4 + j * 2, 2, 1, C('#f0ece0')); blk(p, set0, fl - 9, 12, 3, body); p.hline(set0 + 1, set0 + 10, fl - 9, lv(body, 4.4)); }
  else if (e === 4) { blk(p, set0, fl - 4, 12, 5, body); blk(p, set0 + 2, fl - 13, 4, 10, C('#2a2a30')); p.rect(set0 + 3, fl - 12, 2, 2, C('#80c0a0')); for (let y = fl - 9; y < fl - 4; y += 2) p.hline(set0 + 3, set0 + 4, y, GREY); p.vline(set0 + 5, fl - 15, fl - 13, DGREY); }
  else { blk(p, set0 + 1, fl - 2, 10, 3, C('#e8e8ec')); blk(p, set0 + 3, fl - 12, 6, 10, C('#1a1a1e')); screen(p, set0 + 4, fl - 11, 4, 7, l >= 2, C('#3a5ac8')); }
  if (l >= 2) { // botões de linha
    const bx = 13, n = l === 3 ? 6 : 3;
    blk(p, bx, fl - 7, 8, 8, e === 5 ? C('#e8e8ec') : lv(body, e >= 3 ? 1 : 3));
    for (let i = 0; i < n; i++) p.rect(bx + 1 + (i % 3) * 2, fl - 6 + Math.floor(i / 3) * 3, 1, 2, i === 0 ? C('#48c860') : i === 1 ? C('#f0c040') : C('#e8e4dc'));
    if (l === 3) { for (let y = fl - 1; y > fl - 3; y--) p.hline(bx + 1, bx + 6, y, lv(body, 1.4)); p.hline(bx, bx + 7, fl - 7, GOLD); p.rect(bx + 6, fl - 6, 1, 1, C('#e04848')); p.vline(bx + 7, fl - 12, fl - 8, GOLD); p.disc(bx + 7, fl - 13, 1, GOLD); }
  }
}
/** Arquivo de aço: 2 → 4 → 5 gavetas; nível 3 com barra de tranca, porta-etiquetas de latão e fichário em cima. */
function uFiling(u: Uc): void {
  const { p, e, l, w, h } = u, fl = h - 1;
  const body = [C('#8a5a30'), C('#4a5a3a'), C('#8a9088'), C('#c8b890'), C('#d0ccc0'), C('#3a3c44')][e];
  const n = l === 1 ? 2 : l === 2 ? 4 : 5, dh = 5, top = fl + 1 - n * dh - 2;
  blk(p, 0, top, w, fl - top + 1, body);
  for (let i = 0; i < n; i++) { const y = top + 1 + i * dh; p.rect(1, y, w - 2, dh - 1, lv(body, 2.6)); p.hline(1, w - 2, y, lv(body, 4)); p.rect(w / 2 - 2, y + 1, 4, 1, l === 3 ? GOLD : e === 0 ? BRASS : CHROME); p.rect(w / 2 - 1, y + 2, 2, 1, lv(body, 1.4)); }
  if (l === 3) { p.vline(w - 2, top + 1, fl - 1, CHROME); p.rect(w - 3, top + 1, 2, 2, GOLD); blk(p, 3, top - 4, 9, 4, e === 5 ? C('#e8e8ec') : C('#d8c8a0')); for (let x = 4; x < 11; x += 2) p.vline(x, top - 6, top - 4, W); }
  if (l >= 2 && e >= 2) p.hline(1, w - 2, fl - 1, lv(body, 1));
}
/** Mesa de som: 4 canais num tampo → 8 canais maiores → console de 24 canais com ponte de VU e pés. */
function uMixer(u: Uc): void {
  const { p, fx, e, l, w, h } = u, fl = h - 1, body = ERA_BODY[e], trim = ERA_TRIM[e];
  const ch = l === 1 ? 4 : l === 2 ? 8 : 24, sw = l === 3 ? 2 : 3, cw = ch * sw + 4;
  const x0 = Math.floor((w - cw) / 2);
  const deskTop = l === 3 ? fl - 22 : fl - 14;
  // mesa de apoio (níveis 1 e 2) ou console com pés (nível 3)
  if (l < 3) { const t = e <= 1 ? C('#6a3a22') : e === 2 ? C('#8a7a60') : e === 3 ? C('#7a4a24') : e === 4 ? C('#2a2a30') : C('#e8e6e0'); blk(p, x0 - 4, fl - 8, cw + 8, 2, t); p.vline(x0 - 3, fl - 6, fl, t); p.vline(x0 + cw + 2, fl - 6, fl, t); p.hline(x0 - 3, x0 + cw + 2, fl - 2, lv(t, 1.6)); }
  else { blk(p, 1, fl - 9, w - 2, 9, lv(body, 1.4)); for (let x = 4; x < w - 4; x += 6) p.rect(x, fl - 7, 4, 5, lv(body, 2.2)); }
  const top = l === 3 ? deskTop : fl - 8 - (l === 1 ? 8 : 11);
  const bot = l === 3 ? fl - 9 : fl - 8;
  // corpo inclinado
  p.poly([[x0, bot], [x0 + cw, bot], [x0 + cw, top + 2], [x0, top + 4]], body); p.hline(x0, x0 + cw - 1, bot - 1, lv(body, 1.2));
  p.line(x0, top + 4, x0 + cw - 1, top + 2, lv(body, 4.4));
  for (let i = 0; i < ch; i++) {
    const x = x0 + 2 + i * sw, yk = top + 5;
    p.put(x, yk, [C('#e04848'), C('#3a6ac8'), C('#f0c040'), CHROME][i % 4]); p.put(x, yk + 2, e >= 3 ? CHROME : trim);
    if (e === 0) { p.put(x, yk + 4, trim); continue; } // sem fader: só potenciômetros
    p.vline(x, yk + 4, bot - 2, C('#141418')); p.put(x, yk + 4 + ((i * 3) % Math.max(1, bot - yk - 7)), W);
  }
  // medidores
  const nm = l === 1 ? 1 : l === 2 ? 2 : 6;
  const mw = l === 3 ? 6 : 5;
  const my = l === 3 ? top - 6 : top - 4;
  if (l === 3) blk(p, x0, my - 1, cw, 7, lv(body, 1.6));
  for (let i = 0; i < nm; i++) {
    const mx = x0 + 2 + i * (l === 3 ? Math.floor((cw - 4) / nm) : mw + 2);
    if (e <= 3) { p.rect(mx, my, mw, 4, C('#f0e0a0')); p.line(mx + 1, my + 3, mx + 3 + (i % 2), my + 1, BLACK); p.hline(mx, mx + mw - 1, my + 3, lv(C('#f0e0a0'), 2)); fx.rect(mx, my, mw, 4, withAlpha(C('#ffe08a'), 50)); }
    else if (e === 4) { for (let k = 0; k < 4; k++) p.rect(mx + k, my + 3 - k % 4, 1, 1 + k % 4, k > 2 ? C('#e04848') : C('#48c860')); }
    else { p.rect(mx, my, mw, 4, C('#1a2a4a')); for (let k = 0; k < mw; k++) p.put(mx + k, my + 3 - (k * 2 + i) % 4, C('#5ae0ff')); }
  }
  if (l === 1) { p.vline(x0, my, top + 3, body); } // medidor preso ao corpo
  if (l === 2) { p.vline(x0 + 2, my + 4, top + 3, body); p.vline(x0 + 2 + mw + 2, my + 4, top + 3, body); }
  if (e === 5 && l >= 2) { p.rect(x0 + cw - 9, top + 4, 7, 4, C('#1a2a4a')); p.hline(x0 + cw - 8, x0 + cw - 4, top + 5, C('#5ae0ff')); }
  if (l === 3) { p.hline(x0, x0 + cw - 1, my - 1, trim); p.rect(x0 + cw / 2 - 3, bot - 1, 6, 1, GOLD); }
}
/** Cofre: caixa-forte pequena → cofre de segredo médio → porta de casa-forte com volante e dourado. */
function uSafe(u: Uc): void {
  const { p, e, l, w, h } = u, fl = h - 1;
  const body = [C('#2a2420'), C('#3a5a3a'), C('#6a6e78'), C('#6a4a30'), C('#2e2e34'), C('#1e1e24')][e], trim = l === 3 ? GOLD : ERA_TRIM[e];
  const sw = l === 1 ? 12 : l === 2 ? 18 : w, sh = l === 1 ? 11 : l === 2 ? 19 : h - 1, x = Math.floor((w - sw) / 2), y = fl + 1 - sh;
  blk(p, x, y, sw, sh, body); p.rect(x + 2, y + 2, sw - 4, sh - 4 - (l === 1 ? 0 : 2), lv(body, 2.4)); p.hline(x + 2, x + sw - 3, y + 2, lv(body, 1.4));
  const cx = x + sw / 2 - (l === 3 ? 0 : 2), cy = y + sh / 2 - 1;
  if (e >= 4 && l < 3) { p.rect(cx - 2, cy - 2, 4, 4, C('#141418')); for (let i = 0; i < 4; i++) p.put(cx - 2 + (i % 2) * 2, cy - 2 + Math.floor(i / 2) * 2, e === 5 ? C('#5ae0ff') : C('#48c860')); }
  else { p.disc(cx, cy, l === 3 ? 5 : l === 2 ? 3 : 2, trim); p.disc(cx, cy, l === 3 ? 3.5 : 1.2, lv(trim, 2)); if (l >= 2) for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; p.put(cx + Math.cos(a) * (l === 3 ? 4.5 : 2.6) - 0.5, cy + Math.sin(a) * (l === 3 ? 4.5 : 2.6) - 0.5, lv(trim, 4.6)); } }
  if (l === 3) { for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.3; p.line(cx, cy, cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, CHROME); p.disc(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 1, CHROME); } for (const yy of [y + 4, fl - 5]) { p.rect(x + sw - 3, yy, 2, 3, GOLD); } p.ring(cx, cy, 10, lv(body, 1.4)); }
  else p.rect(x + sw - 4, cy - 1, 2, 3, trim);
  if (l >= 2) { p.rect(x + 1, fl - 1, 2, 1, BLACK); p.rect(x + sw - 3, fl - 1, 2, 1, BLACK); }
  if (e === 0 && l >= 2) { p.hline(x + 3, x + sw - 4, y + 4, GOLD); }
}
/** Livro-caixa: caderno → livro encadernado com fitas → livro e a máquina de contas da época. */
function uLedger(u: Uc): void {
  const { p, e, l, h } = u, fl = h - 1;
  const cov = [C('#6a2a1a'), C('#2a3a5a'), C('#3a5a3a'), C('#8a4a1a'), C('#2a2a3a'), C('#4a4c56')][e];
  if (l === 1) { blk(p, 1, fl - 2, 12, 3, PAPER); p.rect(1, fl - 3, 12, 1, lv(cov, 2)); p.vline(1, fl - 3, fl, cov); for (let x = 3; x < 12; x += 2) p.put(x, fl - 1, lv(PAPER, 2)); }
  else { blk(p, 0, fl - 4, 14, 5, cov); p.rect(1, fl - 3, 12, 3, PAPER); for (let y = fl - 3; y < fl; y++) p.hline(1, 12, y, y % 2 ? lv(PAPER, 2) : PAPER); p.hline(0, 13, fl - 4, lv(cov, 4)); p.rect(0, fl - 4, 2, 5, lv(cov, 1.4)); p.vline(5, fl - 4, fl + 0, RED); p.vline(8, fl - 4, fl + 0, C('#f0c040')); if (e <= 1) p.rect(10, fl - 4, 3, 1, GOLD); }
  if (l === 3) { // máquina de contas
    const x = 15;
    if (e <= 1) { blk(p, x, fl - 6, 9, 7, e === 0 ? C('#3a3a3a') : BLACK); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.put(x + 2 + i * 2, fl - 4 + j * 2, W); p.line(x + 8, fl - 6, x + 8, fl - 10, CHROME); p.put(x + 8, fl - 11, RED); p.rect(x + 1, fl - 8, 5, 2, PAPER); }
    else if (e === 2) { blk(p, x, fl - 5, 9, 6, C('#a8a8a0')); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) p.put(x + 1 + i * 2, fl - 3 + j * 2, BLACK); p.rect(x + 2, fl - 8, 5, 3, PAPER); p.vline(x + 8, fl - 7, fl - 5, BLACK); }
    else if (e === 3) { blk(p, x + 1, fl - 7, 7, 8, C('#2a2a2a')); p.rect(x + 2, fl - 6, 5, 2, C('#e04848')); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.put(x + 2 + i * 2, fl - 3 + j * 2, C('#f0e0c0')); }
    else if (e === 4) { blk(p, x, fl - 1, 9, 2, C('#2a2a30')); p.poly([[x + 1, fl - 1], [x + 8, fl - 1], [x + 8, fl - 8], [x + 2, fl - 8]], C('#3a3a42')); screen(p, x + 3, fl - 7, 4, 5, true, C('#3a6a4a')); }
    else { blk(p, x, fl - 2, 9, 3, C('#e8e8ec')); blk(p, x + 1, fl - 9, 7, 7, C('#1a1a1e')); screen(p, x + 2, fl - 8, 5, 5, true, C('#3a5ac8')); p.hline(x + 3, x + 5, fl - 5, C('#5ae0ff')); }
  }
  if (l >= 2) { p.line(13, fl - 2, 15 - (l === 3 ? 1 : 0), fl - 6, e < 3 ? BLACK : C('#2a5ab0')); } // caneta
}
/** Microfone: simples no pedestal → fita/condensador com aranha → válvula com tela antipop e dourado. */
function uMic(u: Uc): void {
  const { p, e, l, w, h } = u, fl = h - 1, cx = w >> 1;
  const st = [BRASS, CHROME, CHROME, C('#2a2a2a'), BLACK, C('#2a2c34')][e];
  p.vline(cx, 12, fl - 1, st); p.line(cx, fl - 1, cx - 5, fl, st); p.line(cx, fl - 1, cx + 5, fl, st); if (e <= 1) { p.ellipse(cx, fl, 4, 1, st); }
  const head = l === 3 ? GOLD : [C('#3a3a3a'), CHROME, C('#8a8c94'), C('#c8ccd4'), C('#2a2a30'), C('#d8dce4')][e];
  if (l === 1) { if (e === 0) { p.ring(cx, 7, 3, head); p.disc(cx, 7, 2, C('#1a1a1a')); p.vline(cx, 10, 12, head); } else { p.rect(cx - 1, 5, 3, 7, head); p.ellipse(cx, 5, 2, 2.5, lv(head, 2.6)); } return; }
  // aranha (shock mount)
  p.ring(cx, 8, 4, DGREY); p.vline(cx, 12, 13, DGREY);
  if (e <= 1 || l === 2) { blk(p, cx - 2, 2, 5, 10, head); for (let y = 3; y < 11; y += 2) p.hline(cx - 1, cx + 1, y, lv(head, 1.6)); }
  if (l === 3) { blk(p, cx - 2, 1, 5, 12, GOLD); p.ellipse(cx, 1, 2.4, 1.5, lv(GOLD, 4)); for (let y = 2; y < 8; y += 2) p.hline(cx - 1, cx + 1, y, lv(GOLD, 2)); p.rect(cx - 1, 9, 3, 2, C('#1e1e24')); p.line(cx + 2, 6, w - 1, 4, DGREY); p.ring(w - 2.5, 7, 2.5, BLACK); p.disc(w - 2.5, 7, 2, withAlpha(C('#4a4a52'), 170)); p.line(cx, 13, 1, fl - 2, C('#1a1a1a')); }
}
const UDRAW: Record<string, (u: Uc) => void> = { phone: uPhone, filing: uFiling, mixer: uMixer, safe: uSafe, ledger: uLedger, mic: uMic };
/** Tela de aparelho: escura apagada, clara acesa. */
function screen(p: Px, x: number, y: number, w: number, h: number, on: boolean, tone: Col): void {
  p.rect(x, y, w, h, on ? lv(tone, 4) : lv(tone, 1));
  if (w > 2 && h > 2) p.put(x, y, on ? W : lv(tone, 3));
}

const cacheU = new Map<string, Px>();
/** Item obrigatório no nível `level` (1..n), na época do ano (6 épocas de exp5px). Tamanho fixo por item. */
export function upgPx(id: string, year: number, level: number, o: { cond?: DCond } = {}): Px {
  const def = UPG.get(id);
  if (!def) throw new Error(`deco31px: sem upgrade '${id}'`);
  const e = ep5Of(year), l = Math.max(1, Math.min(def.levels.length, Math.round(level))), cond = o.cond ?? 'new';
  const key = `${id}|${e}|${l}|${cond}`;
  const hit = cacheU.get(key);
  if (hit) return hit;
  const layer = new Px(def.w, def.h), fx = new Px(def.w, def.h);
  UDRAW[id]({ p: layer, fx, e, l, w: def.w, h: def.h });
  if (cond === 'used') wear(layer, hashS(id) + e * 13 + l);
  const out = new Px(def.w + 2 * DPAD, def.h + 2 * DPAD);
  out.blit(layer, DPAD, DPAD);
  out.outline(INK);
  out.blit(fx, DPAD, DPAD);
  if (cacheU.size > 600) cacheU.clear();
  cacheU.set(key, out);
  return out;
}
export const upgSize = (id: string): { w: number; h: number } => { const d = UPG.get(id)!; return { w: d.w + 2 * DPAD, h: d.h + 2 * DPAD }; };
