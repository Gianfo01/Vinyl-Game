// R31 · onda 5 (ART5) — OBJETOS do jogo explorável em pixel art: os objetos clicáveis da sede e da casa
// (porta da rua, mapa-múndi, correspondência, calendário, mesa do mês, livro-caixa, cofre, arquivo, fichário, telefone,
// jornal, rádio/TV, quadro de metas, diário, caderno, porta-retratos, quadro branco, mesa de reunião, maquete, mural,
// quadro de planejamento, mesa do olheiro, demos, troféus, chaveiro; espelho, cama, escrivaninha, instrumento, garagem,
// quarto das crianças) e os 4 ícones de viagem (Sede, Casa, Cidade, Mundo).
//
// Mesmo estilo da sede (hqpx27/salas31px) e dos interiores (props31): corte lateral, luz de cima à esquerda, pé em
// sombra arroxeada (blk), contorno escuro quente (INK) de 1 px na silhueta, materiais da paleta da era (paletteOf).
// Escala dos bonecos (avatarSprite 24×34): a porta passa uma pessoa, a mesa bate na cintura, o telefone cabe na mesa.
//
//   ep5Of(ano)                    — PURO: qual das 6 épocas (1889–1919, 1920–49, 1950–69, 1970–89, 1990–2009, 2010–2040);
//   obj5Px(id, ano, estado)       — PURO (só Px): o objeto com margem para o brilho e o selo; tamanho fixo por objeto;
//   travel5Px(id, estado)         — PURO: ícone 16×16 de viagem (aceso e com selo "!"), no padrão de icons.ts;
//   obj5Canvas / travel5Canvas    — DOM: canvas ampliado em escala inteira.
// Tudo determinístico (sem sorteio): mesma entrada, mesmos pixels. Nada vai para o save. Ainda não está ligado em tela.

import { C, INK, Px, lv, mix, noise, upscale, withAlpha, type Col } from './px';
import { paletteOf, type Palette } from './palette';
import { drawText } from './font';

// ---------------------------------------------------------------- épocas e estados

export const EP5 = ['1889', '1920', '1950', '1970', '1990', '2010'] as const;
export type Ep5 = (typeof EP5)[number];
/** Ano típico de cada época (galeria e testes). */
export const EP5_YEAR: Record<Ep5, number> = { '1889': 1905, '1920': 1935, '1950': 1960, '1970': 1980, '1990': 2000, '2010': 2025 };
export const EP5_LABEL: Record<Ep5, string> = { '1889': '1889–1919', '1920': '1920–1949', '1950': '1950–1969', '1970': '1970–1989', '1990': '1990–2009', '2010': '2010–2040' };
/** Índice da época (0..5) de um ano. */
export function ep5Of(year: number): number {
  return year < 1920 ? 0 : year < 1950 ? 1 : year < 1970 ? 2 : year < 1990 ? 3 : year < 2010 ? 4 : 5;
}

/** idle = parado · new = novidade (selo "!") · lit = aceso (mouse em cima / selecionado). */
export type St5 = 'idle' | 'new' | 'lit';
export const ST5: St5[] = ['idle', 'new', 'lit'];

export type Obj5 =
  | 'door' | 'worldmap' | 'mail' | 'calendar' | 'monthdesk'
  | 'ledger' | 'safe' | 'filing' | 'rolodex' | 'phone' | 'paper' | 'radiotv'
  | 'goals' | 'diary' | 'learnbook' | 'photo'
  | 'whiteboard' | 'meeting' | 'model' | 'cork' | 'planning' | 'scoutdesk' | 'demos'
  | 'trophies' | 'keys'
  | 'mirror' | 'bed' | 'writedesk' | 'instrument' | 'garage' | 'kidsroom';

export interface Obj5Def { id: Obj5; w: number; h: number; where: 'sede' | 'casa'; mount: 'floor' | 'wall' | 'desk'; pt: string; en: string }

const D = (id: Obj5, w: number, h: number, where: Obj5Def['where'], mount: Obj5Def['mount'], pt: string, en: string): Obj5Def => ({ id, w, h, where, mount, pt, en });
/** Catálogo: tamanho do desenho em pixels lógicos (sem a margem), onde fica e o nome. */
export const OBJ5: Obj5Def[] = [
  D('door', 22, 38, 'sede', 'floor', 'Porta da rua', 'Front door'),
  D('worldmap', 44, 26, 'sede', 'wall', 'Mapa-múndi', 'World map'),
  D('mail', 20, 18, 'sede', 'desk', 'Correspondência', 'Mail'),
  D('calendar', 16, 22, 'sede', 'wall', 'Calendário', 'Calendar'),
  D('monthdesk', 44, 26, 'sede', 'floor', 'Mesa do mês', 'Desk of the month'),
  D('ledger', 22, 12, 'sede', 'desk', 'Livro-caixa', 'Ledger'),
  D('safe', 20, 24, 'sede', 'floor', 'Cofre', 'Safe'),
  D('filing', 14, 28, 'sede', 'floor', 'Arquivo de aço', 'Filing cabinet'),
  D('rolodex', 16, 12, 'sede', 'desk', 'Fichário', 'Rolodex'),
  D('phone', 14, 16, 'sede', 'desk', 'Telefone', 'Telephone'),
  D('paper', 18, 12, 'sede', 'desk', 'Jornal', 'Newspaper'),
  D('radiotv', 24, 28, 'sede', 'floor', 'Rádio e TV', 'Radio and TV'),
  D('goals', 30, 22, 'sede', 'wall', 'Quadro de metas', 'Goals board'),
  D('diary', 14, 10, 'sede', 'desk', 'Diário', 'Diary'),
  D('learnbook', 24, 18, 'sede', 'wall', 'Caderno de aprendizados', 'Lessons notebook'),
  D('photo', 12, 14, 'sede', 'desk', 'Porta-retratos', 'Photo frame'),
  D('whiteboard', 44, 32, 'sede', 'wall', 'Quadro branco', 'Whiteboard'),
  D('meeting', 60, 22, 'sede', 'floor', 'Mesa de reunião', 'Meeting table'),
  D('model', 22, 32, 'sede', 'floor', 'Maquete do prédio', 'Building model'),
  D('cork', 38, 26, 'sede', 'wall', 'Mural de cortiça', 'Corkboard'),
  D('planning', 50, 28, 'sede', 'wall', 'Quadro de planejamento', 'Planning board'),
  D('scoutdesk', 36, 26, 'sede', 'floor', 'Mesa do olheiro', "Scout's desk"),
  D('demos', 20, 16, 'sede', 'desk', 'Pilha de demos', 'Demo pile'),
  D('trophies', 30, 36, 'sede', 'floor', 'Estante de troféus', 'Trophy cabinet'),
  D('keys', 18, 16, 'sede', 'wall', 'Chaveiro (suas casas)', 'Key rack (your houses)'),
  D('mirror', 16, 34, 'casa', 'floor', 'Espelho', 'Mirror'),
  D('bed', 46, 22, 'casa', 'floor', 'Cama', 'Bed'),
  D('writedesk', 32, 30, 'casa', 'floor', 'Escrivaninha', 'Writing desk'),
  D('instrument', 14, 30, 'casa', 'wall', 'Instrumento na parede', 'Instrument on the wall'),
  D('garage', 56, 40, 'casa', 'floor', 'Garagem', 'Garage'),
  D('kidsroom', 44, 30, 'casa', 'floor', 'Quarto das crianças', "Kids' room"),
];
export const OBJ5_IDS: Obj5[] = OBJ5.map((o) => o.id);
export const obj5Def = (id: Obj5): Obj5Def => OBJ5.find((o) => o.id === id)!;
/** Margem em volta do desenho (brilho de 2 px + espaço do selo "!"). */
export const PAD5 = 4;
/** Tamanho final do Px de um objeto (igual em todas as épocas e estados). */
export const obj5Size = (id: Obj5): { w: number; h: number } => { const d = obj5Def(id); return { w: d.w + 2 * PAD5, h: d.h + 2 * PAD5 }; };

// ---------------------------------------------------------------- peças comuns

/** `fx`: camada de luz (cones, halos) colada depois do contorno — luz não ganha contorno. */
interface Dc { p: Px; fx: Px; pal: Palette; ep: number; year: number; lit: boolean; w: number; h: number }

/** Bloco com luz de cima à esquerda e pé em sombra (mesma conta de prim27.blk). */
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
  p.hline(x + t, x + w - t - 1, y + t, lv(inner, 2)); // sombra da moldura no miolo
};
/** Prego e barbante: quadro pendurado não flutua. */
const hang = (p: Px, cx: number, x0: number, x1: number, yb: number): void => {
  const s = C('#4a3a30');
  p.line(cx, 0, x0, yb, s); p.line(cx, 0, x1, yb, s);
  p.put(cx, 0, C('#8a8a92'));
};
const W = C('#f8f4ec'), PAPER = C('#efe6cc'), RED = C('#c83a32'), GOLD = C('#e0b048'), BRASS = C('#c09048'), CHROME = C('#b8bcc8');
const DARK = C('#2a2630'), BLACK = C('#1e1c22'), BEIGE = C('#d8ccae'), GREY = C('#8a8c94'), DGREY = C('#4a4c56');
const LED = C('#ff4a3a'), SCR = C('#7ad0f0'), GLOW = C('#ffe08a');
/** Tela de aparelho: escura apagada, clara acesa. */
const screen = (p: Px, x: number, y: number, w: number, h: number, on: boolean, tone: Col = C('#3a7ab8')): void => {
  p.rect(x, y, w, h, on ? lv(tone, 4) : lv(tone, 1));
  if (w > 3 && h > 2) { p.hline(x + 1, x + w - 2, y + 1, on ? lv(tone, 5) : lv(tone, 2)); p.put(x + 1, y + 1, on ? W : lv(tone, 3)); }
};
/** Linhas de "texto" cinza num papel. */
const lines = (p: Px, x: number, y: number, w: number, n: number, c: Col, step = 2, seed = 0): void => {
  for (let i = 0; i < n; i++) p.hline(x, x + Math.max(1, w - 1 - Math.floor(noise(i, seed, 7) * Math.min(5, w / 3))), y + i * step, c);
};
/** Pessoinha de foto (cabeça e ombros) — porta-retratos, mural, polaroid. */
const bust = (p: Px, x: number, y: number, skin: Col, cloth: Col, hair: Col): void => {
  p.rect(x, y + 3, 4, 2, cloth); p.hline(x + 1, x + 2, y + 2, cloth);
  p.rect(x + 1, y, 2, 2, skin); p.hline(x + 1, x + 2, y - 1, hair); p.put(x, y, hair);
};
const SKIN = [C('#f0c8a0'), C('#c89070'), C('#8a5a3a')];
/** Pena de tinta, caneta e lápis: acessório da mesa por época. */
const pen = (p: Px, x: number, y: number, ep: number): void => {
  if (ep === 0) { p.line(x, y, x + 3, y - 4, C('#f0ece0')); p.put(x, y, BLACK); return; }
  p.hline(x, x + 4, y, ep < 3 ? BLACK : ep < 5 ? C('#2a5ab0') : DGREY); p.put(x + 4, y, ep < 3 ? GOLD : CHROME);
};

// ---------------------------------------------------------------- sede · recepção

/** Porta da rua: almofadada com bandeira em arco → art déco de vidro fosco → janelinha redonda → faixa de vidro → vidro e alumínio → vidro escuro de correr. */
function door(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const tr = ep === 4 ? C('#a8acb4') : ep === 5 ? C('#2a2a32') : lv(pal.woodDark, 2.6);
  blk(p, 0, 0, w, h, tr); // batente
  const glass = lit ? mix(pal.glass, GLOW, 0.55) : lv(pal.glass, 2.2);
  const x0 = 2, y0 = 3, dw = w - 4, dh = h - y0;
  if (ep <= 3) {
    const wood = ep === 0 ? pal.woodDark : ep === 1 ? C('#6a3a24') : ep === 2 ? C('#9a6a3a') : C('#b0602a');
    if (ep === 0) { p.rect(x0, y0, dw, 6, glass); for (let i = 0; i < 4; i++) p.vline(x0 + 2 + i * 4, y0, y0 + 5, tr); p.hline(x0, x0 + dw - 1, y0 + 6, tr); }
    const dy = ep === 0 ? y0 + 7 : y0;
    blk(p, x0, dy, dw, h - dy, wood);
    if (ep === 0) { // almofadas
      for (const [yy, hh] of [[dy + 2, 10], [dy + 14, 12]] as const) { p.rect(x0 + 2, yy, dw - 4, hh, lv(wood, 2)); p.hline(x0 + 2, x0 + dw - 3, yy, lv(wood, 1)); p.hline(x0 + 2, x0 + dw - 3, yy + hh - 1, lv(wood, 4)); }
    } else if (ep === 1) { // vidro fosco art déco com raios
      p.rect(x0 + 3, dy + 3, dw - 6, 14, glass);
      for (let i = 0; i < 3; i++) p.line(x0 + dw / 2, dy + 16, x0 + 4 + i * ((dw - 8) / 2), dy + 4, lv(glass, 4));
      p.rect(x0 + 3, dy + 20, dw - 6, 8, lv(wood, 2));
    } else if (ep === 2) { p.disc(x0 + dw / 2, dy + 9, 4, glass); p.ring(x0 + dw / 2, dy + 9, 4.5, BRASS); p.hline(x0 + 2, x0 + dw - 3, dy + 20, lv(wood, 2)); }
    else { p.rect(x0 + 3, dy + 3, 3, h - dy - 8, glass); for (let yy = dy + 2; yy < h - 2; yy += 3) p.hline(x0 + 8, x0 + dw - 3, yy, lv(wood, 2.4)); }
    // maçaneta
    p.rect(x0 + dw - 4, y0 + Math.floor(dh * 0.55), 2, 2, ep === 3 ? CHROME : BRASS); p.put(x0 + dw - 4, y0 + Math.floor(dh * 0.55), lv(BRASS, 5));
  } else if (ep === 4) { // vidro com perfil de alumínio e barra
    p.rect(x0, y0, dw, dh, glass); p.vline(x0 + Math.floor(dw / 2), y0, h - 1, tr);
    p.line(x0 + 1, y0 + 10, x0 + 5, y0 + 4, lv(glass, 5)); p.line(x0 + 10, y0 + 18, x0 + 14, y0 + 12, lv(glass, 5));
    p.rect(x0 + 2, y0 + 17, dw - 4, 2, CHROME); p.rect(x0, h - 3, dw, 3, tr);
  } else { // vidro escuro de correr com faixa de luz
    p.rect(x0, y0, dw, dh, lit ? mix(C('#2a3a4a'), GLOW, 0.35) : C('#26303c'));
    p.vline(x0 + Math.floor(dw / 2), y0, h - 1, C('#16161c'));
    p.line(x0 + 2, y0 + 14, x0 + 8, y0 + 6, C('#5a6a7a'));
    p.vline(x0 + Math.floor(dw / 2) - 2, y0 + 12, y0 + 22, CHROME);
    p.hline(0, w - 1, 1, lit ? GLOW : C('#9adcff'));
  }
  // capacho
  p.rect(1, h - 2, w - 2, 2, lv(C('#8a5a3a'), 2)); p.hline(2, w - 3, h - 2, lv(C('#8a5a3a'), 3));
}

/** Mapa-múndi: pergaminho emoldurado com rosa dos ventos → mapa político pastel → mapa escolar de enrolar → mapa com alfinetes e fio → plastificado colorido → tela com pontos de luz. */
function worldmap(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const sea = [C('#d8c08a'), C('#c8d8d0'), C('#5a8ac8'), C('#a8c8e0'), C('#4a8ae0'), C('#16243a')][ep];
  const land = [C('#a87a48'), C('#d8b878'), C('#e8d890'), C('#c8a870'), C('#48b85c'), C('#2a8a9a')][ep];
  const top = ep === 2 ? 4 : 0;
  if (ep === 2) { // rolo de mapa escolar: vareta e argola
    blk(p, 0, 1, w, 3, pal.woodDark); p.disc(w / 2, 1.5, 1.4, BRASS);
  } else hang(p, Math.floor(w / 2), 6, w - 7, 3);
  const fx = 0, fy = top + (ep === 2 ? 0 : 3), fw = w, fh = h - fy - (ep === 2 ? 2 : 0);
  const fr = ep === 5 ? C('#16161c') : ep === 4 ? C('#d8dce4') : ep === 3 ? C('#7a5a3a') : pal.woodDark;
  const t = ep === 2 ? 0 : 2;
  if (t) blk(p, fx, fy, fw, fh, fr);
  const ix = fx + t, iy = fy + t, iw = fw - 2 * t, ih = fh - 2 * t;
  p.rect(ix, iy, iw, ih, sea);
  const cont: [number, number, number, number][] = [
    [0.2, 0.3, 0.13, 0.16], [0.13, 0.22, 0.06, 0.08], [0.29, 0.68, 0.06, 0.17], [0.37, 0.1, 0.04, 0.05], [0.49, 0.26, 0.05, 0.08],
    [0.52, 0.6, 0.075, 0.18], [0.7, 0.3, 0.17, 0.15], [0.66, 0.5, 0.03, 0.07], [0.8, 0.52, 0.03, 0.04], [0.84, 0.74, 0.065, 0.07],
  ];
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) {
    const u = (x + 0.5) / iw, v = (y + 0.5) / ih;
    let on = false;
    for (const [cx, cy, rx, ry] of cont) { const k = ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2; if (k < 1 - noise(x, y, 31) * 0.35) { on = true; break; } }
    if (on) p.set(ix + x, iy + y, (x + y) % 7 === 0 && ep !== 5 ? lv(land, 2.4) : land);
    else if (ep === 5 && (x % 4 === 0 || y % 4 === 0)) p.set(ix + x, iy + y, lv(sea, 4));
  }
  if (ep === 0) { p.disc(ix + iw - 5, iy + ih - 5, 2.5, lv(sea, 2)); p.vline(ix + iw - 5, iy + ih - 9, iy + ih - 2, lv(land, 1)); p.hline(ix + iw - 9, ix + iw - 2, iy + ih - 5, lv(land, 1)); }
  if (ep === 1) for (let i = 0; i < 6; i++) p.vline(ix + 4 + i * 6, iy, iy + ih - 1, withAlpha(lv(sea, 1), 60));
  if (ep === 2) { p.hline(ix, ix + iw - 1, iy + ih, pal.woodDark); p.hline(ix, ix + iw - 1, iy + ih + 1, lv(pal.woodDark, 1)); }
  // alfinetes / pontos (onde o selo está)
  const pins: [number, number][] = [[0.49, 0.25], [0.24, 0.32], [0.3, 0.62], [0.72, 0.3], [0.52, 0.55]];
  pins.forEach(([u, v], i) => {
    const x = ix + Math.round(u * iw), y = iy + Math.round(v * ih);
    if (ep === 5) { p.put(x, y, lit ? W : GLOW); if (lit) d.fx.disc(x + 0.5, y + 0.5, 1.6, withAlpha(GLOW, 90)); }
    else { p.put(x, y, [RED, C('#3a6ac8'), C('#e0c040'), RED, C('#3a9a4a')][i]); p.put(x, y + 1, DARK); }
  });
  if (ep === 3) { p.line(ix + Math.round(0.49 * iw), iy + Math.round(0.25 * ih), ix + Math.round(0.24 * iw), iy + Math.round(0.32 * ih), RED); p.line(ix + Math.round(0.49 * iw), iy + Math.round(0.25 * ih), ix + Math.round(0.72 * iw), iy + Math.round(0.3 * ih), RED); }
  if (lit && ep !== 5) p.rect(ix, iy, iw, ih, withAlpha(GLOW, 36));
}

/** Correspondência: escaninho de madeira com cartas lacradas → bandeja de arame com telegrama → bandeja dupla → secretária eletrônica de fita → secretária digital → celular no carregador. */
function mail(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const env = (x: number, y: number, ew: number, eh: number, seal?: Col, c: Col = PAPER) => {
    p.rect(x, y, ew, eh, c); p.hline(x, x + ew - 1, y, lv(c, 4)); p.line(x, y, x + (ew >> 1), y + (eh >> 1), lv(c, 1.8)); p.line(x + ew - 1, y, x + (ew >> 1), y + (eh >> 1), lv(c, 1.8));
    if (seal) { p.rect(x + (ew >> 1) - 1, y + (eh >> 1), 2, 2, seal); p.put(x + (ew >> 1) - 1, y + (eh >> 1), lv(seal, 4.4)); }
  };
  if (ep === 0) { // escaninho na parede
    blk(p, 0, 0, w, h, pal.woodDark);
    for (let i = 0; i < 3; i++) { const x = 2 + i * 6; p.rect(x, 2, 5, 7, lv(pal.woodDark, 0.8)); p.rect(x, 10, 5, 6, lv(pal.woodDark, 0.8)); }
    env(2, 4, 5, 4, RED); env(8, 3, 5, 5, C('#3a6ac8')); env(14, 5, 5, 3, C('#2a8a4a')); env(2, 12, 5, 4, C('#8a4ab0')); env(8, 12, 5, 4); env(14, 11, 5, 5, RED);
    return;
  }
  if (ep === 1 || ep === 2) { // bandeja de arame (1 ou 2 andares) com cartas e o telegrama amarelo
    const metal = ep === 1 ? BRASS : CHROME;
    const tray = (y: number) => { p.hline(1, w - 2, y, lv(metal, 2)); p.vline(1, y - 3, y, metal); p.vline(w - 2, y - 3, y, metal); for (let x = 3; x < w - 2; x += 3) p.vline(x, y - 3, y, lv(metal, 1.6)); p.hline(1, w - 2, y - 3, lv(metal, 4)); };
    if (ep === 2) { tray(8); p.vline(2, 8, h - 1, metal); p.vline(w - 3, 8, h - 1, metal); env(3, 3, 13, 5, RED); }
    env(3, h - 7, 14, 5, ep === 1 ? RED : C('#3a6ac8')); env(4, h - 9, 12, 4, undefined, C('#f0e8a0'));
    p.rect(5, h - 11, 11, 4, C('#f0d040')); p.hline(6, 14, h - 10, C('#8a6a10')); p.hline(6, 11, h - 9, C('#8a6a10')); // telegrama
    tray(h - 1);
    return;
  }
  if (ep === 3) { // secretária eletrônica de fita
    blk(p, 0, h - 9, w, 9, C('#6a5a48'));
    p.rect(2, h - 8, 7, 5, C('#2a2420')); p.rect(3, h - 7, 5, 3, C('#5a4a3a')); p.disc(4.5, h - 5.5, 0.9, BLACK); p.disc(6.5, h - 5.5, 0.9, BLACK);
    for (let i = 0; i < 3; i++) p.rect(11 + i * 3, h - 6, 2, 2, BEIGE);
    p.rect(w - 4, h - 8, 2, 2, lit ? LED : lv(LED, 1)); if (lit) d.fx.disc(w - 3, h - 7, 2.4, withAlpha(LED, 70));
    p.line(w - 3, h - 9, w - 1, h - 15, BLACK); // antena do fone sem fio
    blk(p, 2, h - 14, 13, 5, C('#7a6a58')); p.rect(4, h - 13, 9, 1, C('#4a3a2a'));
    return;
  }
  if (ep === 4) { // secretária digital preta com visor
    blk(p, 1, h - 8, w - 2, 8, C('#2a2a30'));
    p.rect(3, h - 6, 7, 4, lit ? C('#9af0a0') : C('#3a6a40')); drawText(p, '3', 5, h - 6, lit ? C('#1a3a1a') : C('#2a4a2a'));
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) p.rect(12 + i * 3, h - 7 + j * 3, 2, 2, GREY);
    p.put(w - 3, h - 7, lit ? LED : lv(LED, 1));
    blk(p, 4, h - 15, 12, 7, C('#3a3a42')); p.rect(6, h - 13, 8, 2, C('#1a1a1e')); p.vline(14, h - 18, h - 15, C('#3a3a42'));
    return;
  }
  // celular no carregador
  blk(p, 4, h - 3, 12, 3, C('#dcdce4'));
  blk(p, 6, 1, 8, h - 4, BLACK);
  screen(p, 7, 2, 6, h - 7, lit, C('#3a5ac8'));
  for (let i = 0; i < 3; i++) p.rect(8, 5 + i * 3, 4, 2, lit ? W : C('#5a6aa8'));
  p.rect(12, 1, 3, 3, RED); p.put(13, 2, W);
}

/** Calendário de parede: bloco de arrancar → ilustrado → foto de carro → laranja dos anos 70 → espiral com foto → painel de tinta eletrônica. */
function calendar(d: Dc): void {
  const { p, ep, lit, w, h } = d;
  if (ep < 5) hang(p, Math.floor(w / 2), 2, w - 3, 3);
  const y0 = ep < 5 ? 3 : 1;
  const card = ep === 3 ? C('#e8a050') : ep === 0 ? C('#d8c49a') : PAPER;
  if (ep === 5) { blk(p, 0, y0, w, h - y0, C('#2a2a30')); p.rect(2, y0 + 2, w - 4, h - y0 - 4, lit ? C('#f0f0e8') : C('#c8c8c0')); }
  else blk(p, 0, y0, w, h - y0, card);
  const img = y0 + 2, ih = ep === 0 ? 6 : 7;
  if (ep === 0) { drawText(p, '14', 4, img + 1, RED); p.rect(2, img + 7, w - 4, h - img - 9, W); lines(p, 3, img + 9, w - 6, 3, GREY, 2); }
  else {
    const art = [C('#7aa0c8'), C('#7aa0c8'), C('#78b8ac'), C('#e06030'), C('#48a0e0'), C('#3a3a42')][ep];
    p.rect(2, img, w - 4, ih, art);
    if (ep === 1) { p.poly([[2, img + ih], [7, img + 2], [11, img + ih]], C('#5a7a4a')); p.disc(w - 5, img + 2, 1.4, GLOW); }
    if (ep === 2) { p.rect(4, img + 3, 8, 3, RED); p.disc(6, img + 6, 1, BLACK); p.disc(10, img + 6, 1, BLACK); }
    if (ep === 3) { p.disc(w / 2, img + 4, 2.5, C('#f0d040')); }
    if (ep === 4) { p.poly([[2, img + ih], [8, img + 2], [14, img + ih]], C('#e8f0f8')); }
    if (ep === 5) { drawText(p, 'SET', 3, img + 1, lit ? GLOW : C('#9a9aa8')); }
    if (ep === 4) for (let x = 2; x < w - 2; x += 2) p.put(x, y0, DGREY); // espiral
    // grade de dias, um circulado
    const gy = img + ih + 1;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) p.put(2 + c * 3, gy + r * 2 + 1, ep === 5 ? DGREY : lv(card, 1));
    p.ring(2 + 2 * 3 + 0.5, gy + 2 * 2 + 1.5, 1.6, RED);
  }
}

/** Mesa do mês: escrivaninha de mogno com abajur verde → art déco → teca com máquina de escrever → fórmica laranja → cinza com computador bege → branca com notebook. */
function monthdesk(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const top = [pal.woodDark, C('#5a3020'), C('#a8703e'), C('#b88a5a'), C('#a8a8b0'), C('#e8e6e0')][ep];
  const ty = h - 13;
  blk(p, 0, ty, w, 3, top);
  // pés/gaveteiro
  if (ep <= 1) { blk(p, 1, ty + 3, 12, h - ty - 3, lv(top, 2.4)); blk(p, w - 13, ty + 3, 12, h - ty - 3, lv(top, 2.4)); for (let i = 0; i < 2; i++) { p.hline(3, 10, ty + 7 + i * 4, lv(top, 1)); p.put(7, ty + 5 + i * 4, BRASS); p.hline(w - 11, w - 4, ty + 7 + i * 4, lv(top, 1)); p.put(w - 7, ty + 5 + i * 4, BRASS); } }
  else if (ep === 2) { p.line(3, ty + 3, 1, h - 1, lv(top, 1.4)); p.line(w - 4, ty + 3, w - 2, h - 1, lv(top, 1.4)); blk(p, w - 16, ty + 3, 12, 5, lv(top, 2.4)); p.put(w - 10, ty + 5, BRASS); }
  else if (ep === 3) { blk(p, 1, ty + 3, w - 2, h - ty - 3, C('#c87a3a')); p.rect(4, ty + 6, w - 8, 1, lv(C('#c87a3a'), 1.4)); }
  else if (ep === 4) { blk(p, w - 14, ty + 3, 13, h - ty - 3, C('#8a8a92')); p.rect(1, ty + 3, 2, h - ty - 3, C('#6a6a72')); for (let i = 0; i < 2; i++) p.hline(w - 12, w - 3, ty + 7 + i * 4, C('#6a6a72')); }
  else { p.rect(2, ty + 3, 1, h - ty - 3, C('#9a9aa2')); p.rect(w - 3, ty + 3, 1, h - ty - 3, C('#9a9aa2')); p.hline(2, w - 3, h - 1, C('#9a9aa2')); }
  // mata-borrão / papéis do mês
  p.rect(12, ty - 1, 16, 1, ep < 3 ? C('#3a6a4a') : W);
  p.rect(15, ty - 2, 9, 1, W); p.put(18, ty - 3, W);
  // abajur ou aparelho
  if (ep === 0) { // abajur de banqueiro verde + tinteiro
    p.vline(5, ty - 7, ty - 1, BRASS); p.hline(3, 7, ty - 1, BRASS); p.poly([[1, ty - 7], [10, ty - 7], [9, ty - 10], [2, ty - 10]], C('#2a7a4a')); p.hline(2, 9, ty - 10, lv(C('#2a7a4a'), 4.4));
    if (lit) d.fx.poly([[1, ty - 6], [10, ty - 6], [13, ty], [-2, ty]], withAlpha(GLOW, 70));
    p.rect(w - 8, ty - 3, 3, 3, BLACK); pen(p, w - 6, ty - 3, 0);
  } else if (ep === 1) {
    p.vline(5, ty - 8, ty - 1, CHROME); p.ellipse(5, ty - 1, 2, 0.6, CHROME); p.ellipse(5, ty - 9, 3, 1.4, C('#e8d8a0'));
    if (lit) d.fx.poly([[2, ty - 8], [8, ty - 8], [11, ty], [-1, ty]], withAlpha(GLOW, 70));
    blk(p, w - 12, ty - 4, 8, 4, BLACK); p.rect(w - 11, ty - 5, 6, 1, BLACK);
  } else if (ep <= 3) { // máquina de escrever
    const tw = ep === 2 ? C('#4a5a52') : C('#c8502a');
    blk(p, w - 16, ty - 5, 12, 5, tw); p.rect(w - 14, ty - 8, 8, 3, W); p.rect(w - 17, ty - 5, 14, 1, lv(tw, 4)); for (let i = 0; i < 4; i++) p.put(w - 14 + i * 2, ty - 2, lv(tw, 5));
    p.vline(4, ty - 9, ty - 1, BLACK); p.line(4, ty - 9, 8, ty - 11, BLACK); p.poly([[6, ty - 11], [11, ty - 11], [10, ty - 8], [7, ty - 8]], ep === 2 ? C('#d85a4a') : C('#e8a030'));
    if (lit) d.fx.poly([[6, ty - 8], [11, ty - 8], [14, ty], [3, ty]], withAlpha(GLOW, 70));
  } else if (ep === 4) { // computador bege de tubo
    blk(p, w - 17, ty - 12, 13, 11, C('#d8d0bc')); screen(p, w - 15, ty - 10, 9, 7, lit); p.rect(w - 18, ty - 1, 15, 1, C('#c8c0a8'));
    p.vline(4, ty - 9, ty - 1, DGREY); p.poly([[2, ty - 11], [8, ty - 11], [7, ty - 8], [3, ty - 8]], DGREY);
    if (lit) d.fx.poly([[3, ty - 8], [8, ty - 8], [10, ty], [1, ty]], withAlpha(GLOW, 60));
  } else { // notebook aberto
    p.poly([[w - 16, ty - 1], [w - 5, ty - 1], [w - 6, ty - 9], [w - 15, ty - 9]], C('#c8ccd4')); screen(p, w - 14, ty - 8, 7, 5, lit, C('#5a6ad8'));
    p.rect(w - 17, ty - 1, 13, 1, C('#a8acb4'));
    p.vline(4, ty - 10, ty - 1, C('#3a3a42')); p.line(4, ty - 10, 9, ty - 10, C('#3a3a42')); p.rect(8, ty - 10, 3, 1, lit ? W : C('#c8c8d0'));
    if (lit) d.fx.poly([[7, ty - 9], [12, ty - 9], [14, ty], [5, ty]], withAlpha(C('#ffffff'), 50));
  }
}

// ---------------------------------------------------------------- sede · sua sala

/** Livro-caixa verde pautado aberto, com o acessório da época: pena e tinteiro, caneta-tinteiro, somadora, calculadora, calculadora de bobina, tablet. */
function ledger(d: Dc): void {
  const { p, ep, lit, h } = d;
  const cover = C('#2a6a3a');
  blk(p, 0, h - 9, 16, 9, cover);
  const page = lit ? C('#fbf6e2') : C('#efe6c8');
  p.rect(1, h - 8, 7, 7, page); p.rect(8, h - 8, 7, 7, lv(page, 2.6));
  p.vline(8, h - 8, h - 2, lv(cover, 1));
  for (let y = h - 7; y < h - 1; y += 2) { p.hline(1, 7, y, C('#8ac09a')); p.hline(8, 14, y, C('#7ab08a')); }
  p.vline(5, h - 8, h - 2, C('#d06a5a')); p.vline(12, h - 8, h - 2, C('#c06a5a'));
  p.vline(3, h - 13, h - 8, RED); p.put(3, h - 13, lv(RED, 4)); // fita marcadora
  const ax = 16;
  if (ep === 0) { p.rect(ax + 1, h - 4, 4, 4, BLACK); p.put(ax + 2, h - 4, C('#3a3a5a')); p.line(ax + 3, h - 4, ax + 5, h - 10, W); }
  else if (ep === 1) { pen(p, ax, h - 2, 1); p.line(ax, h - 3, ax + 4, h - 5, BLACK); }
  else if (ep === 2) { blk(p, ax, h - 6, 6, 6, C('#4a4a52')); p.rect(ax + 1, h - 5, 4, 1, C('#a8a8b0')); p.vline(ax + 5, h - 9, h - 6, CHROME); for (let i = 0; i < 2; i++) p.hline(ax + 1, ax + 4, h - 3 + i, GREY); }
  else if (ep === 3) { blk(p, ax, h - 7, 6, 7, C('#3a3a3a')); p.rect(ax + 1, h - 6, 4, 2, lit ? C('#ff8a5a') : C('#8a3a2a')); for (let i = 0; i < 2; i++) p.hline(ax + 1, ax + 4, h - 3 + i, BEIGE); }
  else if (ep === 4) { blk(p, ax, h - 6, 6, 6, BEIGE); p.rect(ax + 1, h - 5, 4, 1, C('#4a5a4a')); p.rect(ax + 1, h - 11, 4, 5, W); lines(p, ax + 1, h - 10, 4, 3, GREY, 2); }
  else { blk(p, ax - 1, h - 9, 7, 9, BLACK); screen(p, ax, h - 8, 5, 7, lit, C('#2a6a4a')); p.line(ax + 1, h - 3, ax + 3, h - 6, C('#7af08a')); }
}

/** Cofre: ferro preto com filete dourado sobre pés → verde com puxador cromado → cinza → marrom → grafite com teclado → preto com teclado aceso. */
function safe(d: Dc): void {
  const { p, ep, lit, w, h } = d;
  const body = [C('#2a2a30'), C('#3a5a48'), C('#6a6e78'), C('#7a5a3a'), C('#3a3c44'), C('#1e1e24')][ep];
  const fh = ep === 0 ? 3 : 1;
  blk(p, 0, 0, w, h - fh, body);
  if (ep === 0) { p.rect(1, h - 3, 3, 3, BLACK); p.rect(w - 4, h - 3, 3, 3, BLACK); }
  else p.hline(1, w - 2, h - 1, lv(body, 0.6));
  p.rect(2, 2, w - 4, h - fh - 4, lv(body, 2.2)); p.hline(2, w - 3, 2, lv(body, 1)); // porta
  if (ep === 0) { p.rect(3, 3, w - 6, 1, GOLD); p.rect(3, h - fh - 4, w - 6, 1, GOLD); p.vline(3, 3, h - fh - 4, GOLD); p.vline(w - 4, 3, h - fh - 4, GOLD); }
  const cx = Math.floor(w / 2), cy = Math.floor((h - fh) / 2);
  if (ep <= 3) {
    p.disc(cx - 2, cy, 3.2, ep === 0 ? GOLD : CHROME); p.disc(cx - 2, cy, 1.6, lv(ep === 0 ? GOLD : CHROME, 1.6)); p.put(cx - 3, cy - 3, BLACK);
    if (lit) p.put(cx - 4, cy - 2, W);
    p.rect(cx + 3, cy - 1, 4, 2, ep === 0 ? GOLD : CHROME); p.vline(cx + 6, cy - 2, cy + 2, ep === 0 ? GOLD : CHROME);
  } else {
    p.rect(cx - 5, cy - 4, 6, 8, BLACK); p.rect(cx - 4, cy - 3, 4, 1, lit ? C('#7af08a') : C('#2a4a2a'));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.put(cx - 4 + j * 2, cy - 1 + i * 2, lit && ep === 5 ? SCR : GREY);
    p.rect(cx + 3, cy - 3, 2, 7, CHROME);
    if (ep === 5) p.hline(3, w - 4, 3, lit ? SCR : C('#2a4a6a'));
  }
}

/** Arquivo de aço: gaveteiro de fichas de carvalho → aço verde-oliva → cinza-esverdeado → bege → creme → grafite. */
function filing(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const body = [pal.wood, C('#5a6a48'), C('#7a8a80'), C('#b8a88a'), C('#d8d0bc'), C('#4a4c56')][ep];
  blk(p, 0, 0, w, h, body);
  const n = ep === 0 ? 6 : 4, gh = Math.floor((h - 2) / n);
  for (let i = 0; i < n; i++) {
    const y = 1 + i * gh;
    p.hline(1, w - 2, y + gh - 1, lv(body, 1)); p.hline(1, w - 2, y, lv(body, 3.8));
    if (ep === 0) { p.rect(3, y + 2, 3, 2, W); p.put(10, y + 3, BRASS); p.vline(7, y + 1, y + gh - 2, lv(body, 1.6)); p.rect(9, y + 2, 3, 2, W); }
    else { p.rect(4, y + 2, 6, 2, lit && i === 0 ? W : PAPER); p.rect(5, y + 4, 4, 1, ep === 5 ? CHROME : lv(body, 1)); p.rect(5, y + 5, 4, 1, ep === 5 ? CHROME : C('#c8c8d0')); }
  }
  if (ep === 2 || ep === 3) p.rect(2, h - 1, w - 4, 1, lv(body, 0.6));
}

/** Fichário: caixa de fichas de madeira → caixa de lata → rolodex preto → rolodex laranja → rolodex com tampa fumê → rolodex preto fino com cromado. */
function rolodex(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const cards = lit ? C('#fbf6e8') : PAPER;
  if (ep <= 1) {
    const box = ep === 0 ? pal.wood : C('#6a7a6a');
    for (let i = 0; i < 5; i++) { p.rect(2 + i * 2, h - 9 - (i % 2), 9, 4, i % 2 ? lv(cards, 2.6) : cards); }
    p.rect(9, h - 11, 3, 2, RED);
    blk(p, 0, h - 6, w, 6, box); p.rect(Math.floor(w / 2) - 2, h - 4, 4, 2, ep === 0 ? BRASS : CHROME);
    return;
  }
  const knob = ep === 3 ? C('#e07a2a') : ep === 5 ? CHROME : BLACK;
  const cy = h - 6;
  // cartões em leque no eixo
  for (let i = -3; i <= 3; i++) { const x = 8 + i * 1.6; p.line(Math.round(8 + i * 0.6), cy, Math.round(x), cy - 5 + Math.abs(i) * 0.6, i === 0 ? W : lv(cards, 2.8 + (i & 1) * 0.6)); }
  p.rect(5, cy - 6, 6, 4, cards); p.hline(5, 10, cy - 6, RED); p.rect(9, cy - 7, 2, 1, C('#3a6ac8'));
  if (ep === 4) p.ellipse(8, cy - 4, 6, 4, withAlpha(C('#6a6a7a'), 110));
  p.rect(1, cy, 1, 1, knob); p.disc(1.5, cy + 0.5, 1.6, knob); p.disc(w - 1.5, cy + 0.5, 1.6, knob);
  p.hline(2, w - 3, cy, ep === 5 ? CHROME : DGREY);
  const base = ep === 3 ? C('#c86a2a') : ep === 4 ? C('#5a5a62') : ep === 5 ? C('#2a2a30') : BLACK;
  p.poly([[3, cy + 1], [w - 3, cy + 1], [w - 1, h], [1, h]], base);
  p.hline(3, w - 4, cy + 1, lv(base, 4));
}

/** Telefone: castiçal com fone pendurado → baquelite de gancho → preto de disco → colorido de disco → de teclas com fio → celular no suporte. */
function phone(d: Dc): void {
  const { p, ep, lit, w, h } = d;
  if (ep === 0) { // castiçal
    p.ellipse(6, h - 2, 4, 1.4, BLACK); p.rect(5, 4, 2, h - 5, BLACK); p.disc(6, 3, 2, BLACK); p.rect(4, 2, 4, 1, lv(BLACK, 4));
    p.hline(7, 9, 6, BRASS); p.rect(9, 5, 2, 5, BLACK); p.disc(10, 10, 1.4, BLACK); p.put(9, 5, BRASS);
    p.line(6, h - 2, 12, h - 1, DGREY);
    return;
  }
  if (ep === 5) { // celular em pé no suporte
    p.poly([[3, h - 1], [11, h - 1], [9, h - 4], [5, h - 4]], C('#c8ccd4'));
    blk(p, 4, 1, 7, h - 4, BLACK); screen(p, 5, 2, 5, h - 7, lit, C('#5a6ad8'));
    if (lit) { p.rect(6, 4, 3, 3, C('#48b85c')); p.put(7, 5, W); }
    p.hline(6, 8, h - 5, DGREY);
    return;
  }
  const body = ep === 1 ? BLACK : ep === 2 ? C('#26262c') : ep === 3 ? C('#d85a2a') : C('#c8c4b8');
  blk(p, 1, h - 7, w - 2, 7, body);
  p.poly([[2, h - 7], [w - 2, h - 7], [w - 4, h - 10], [4, h - 10]], lv(body, 3.4));
  // fone no gancho
  blk(p, 0, h - 12, w, 3, body); p.rect(0, h - 13, 3, 2, body); p.rect(w - 3, h - 13, 3, 2, body); p.hline(1, w - 2, h - 12, lv(body, 4.6));
  if (ep <= 3) { p.disc(w / 2, h - 4, 2.6, ep === 3 ? W : lv(body, 2)); p.ring(w / 2, h - 4, 1.8, ep === 3 ? lv(body, 2) : GREY); p.put(Math.floor(w / 2), h - 4, BLACK); }
  else { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.put(4 + i * 2, h - 5 + j * 2, DGREY); p.rect(w - 5, h - 6, 3, 2, lit ? C('#9af0a0') : C('#5a7a5a')); }
  p.line(w - 2, h - 3, w - 1, h - 1, DGREY);
  if (lit && ep !== 4) { p.put(0, h - 15, GLOW); p.put(w - 1, h - 15, GLOW); p.put(1, h - 16, GLOW); p.put(w - 2, h - 16, GLOW); }
}

/** Jornal dobrado na mesa: gravura sépia → foto p&b → manchete vermelha → foto colorida → faixa colorida → tablet com o app. */
function paper(d: Dc): void {
  const { p, ep, lit, w, h } = d;
  if (ep === 5) {
    blk(p, 1, 1, w - 2, h - 1, BLACK); p.rect(2, 2, w - 4, h - 3, lit ? C('#f4f4f8') : C('#c8c8d0'));
    p.rect(3, 3, w - 6, 2, RED); p.rect(3, 6, 6, 4, C('#5a8ac8')); lines(p, 10, 6, w - 13, 3, GREY, 2);
    return;
  }
  const pg = ep === 0 ? C('#e0d4b4') : ep === 3 ? C('#ece8dc') : C('#e8e4d8');
  p.poly([[0, h - 1], [w - 1, h - 1], [w - 2, 1], [1, 2]], pg);
  p.hline(1, w - 3, 1, lv(pg, 4.4)); p.line(0, h - 1, 1, 2, lv(pg, 2)); p.vline(Math.floor(w / 2), 2, h - 1, lv(pg, 2.2)); // dobra
  const mh = [DARK, DARK, RED, C('#2a4a8a'), C('#c82a2a')][ep];
  p.rect(2, 3, w - 5, 2, mh);
  const pic = [C('#9a7a5a'), C('#6a6a6a'), C('#5a5a5a'), C('#d88a4a'), C('#4aa0d8')][ep];
  p.rect(2, 6, 6, 4, pic); if (ep >= 3) p.rect(3, 8, 3, 2, ep === 3 ? C('#4a8a4a') : C('#e0c040'));
  lines(p, 9, 6, w - 11, 3, lv(pg, 1), 2);
  if (lit) p.rect(2, 3, w - 5, 2, lv(mh, 4));
}

/** Rádio e TV: gramofone de corneta → rádio capelinha → TV de móvel com pés → TV colorida de madeira → TV de tubo com videocassete → TV de tela plana no rack. */
function radiotv(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  if (ep === 0) {
    blk(p, 4, h - 10, 16, 10, pal.woodDark); p.rect(6, h - 7, 12, 1, lv(pal.woodDark, 1));
    blk(p, 5, h - 13, 14, 3, pal.wood); p.ellipse(12, h - 13, 6, 1, C('#1e1c22'));
    p.line(12, h - 14, 13, h - 18, BRASS);
    p.poly([[12, h - 18], [14, h - 18], [w - 1, 1], [8, 4]], C('#c89a3a')); p.line(13, h - 18, 9, 5, lv(C('#c89a3a'), 4.6));
    p.ellipse(15, 3, 7, 3, lv(C('#c89a3a'), 1.8));
    if (lit) d.fx.ellipse(15, 3, 5, 2, withAlpha(GLOW, 110));
    return;
  }
  if (ep === 1) { // capelinha sobre mesinha
    p.rect(3, h - 9, 18, 2, pal.wood); p.vline(5, h - 7, h - 1, pal.woodDark); p.vline(18, h - 7, h - 1, pal.woodDark);
    p.ellipse(12, h - 19, 8, 7, pal.wood); blk(p, 4, h - 19, 16, 10, pal.wood);
    p.ellipse(12, h - 18, 5, 4, C('#d8c088')); for (let x = 9; x <= 15; x += 2) p.vline(x, h - 21, h - 15, lv(pal.wood, 1.4));
    p.rect(8, h - 13, 8, 2, lit ? GLOW : C('#c8a860')); p.put(9, h - 12, RED);
    p.disc(7, h - 10.5, 0.9, BRASS); p.disc(17, h - 10.5, 0.9, BRASS);
    return;
  }
  if (ep === 2) { // TV de móvel com pés palito
    blk(p, 1, 4, w - 2, h - 9, pal.wood);
    p.rect(3, 6, 14, 12, C('#2a2a2a')); p.ellipse(10, 12, 6.5, 5.5, lit ? C('#c8e0d8') : C('#5a6a64'));
    if (lit) for (let y = 8; y < 17; y += 2) p.hline(5, 15, y, withAlpha(C('#ffffff'), 60));
    p.disc(20, 8, 1.3, BRASS); p.disc(20, 12, 1.3, BRASS); for (let y = 15; y < 19; y += 2) p.hline(19, 21, y, lv(pal.wood, 1.4));
    p.line(4, h - 5, 2, h - 1, pal.woodDark); p.line(w - 5, h - 5, w - 3, h - 1, pal.woodDark);
    p.line(9, 4, 6, 0, DGREY); p.line(14, 4, 17, 0, DGREY); // antena
    return;
  }
  if (ep === 3) { // colorida de madeira com seletor
    blk(p, 0, 6, w, h - 7, C('#8a5a30'));
    blk(p, 2, 8, 15, 12, C('#3a3a3a')); screen(p, 3, 9, 13, 10, lit, C('#d0702a'));
    if (lit) { p.rect(5, 13, 4, 3, C('#48b85c')); p.rect(10, 11, 4, 4, C('#e0c040')); }
    p.disc(20, 10, 1.6, BEIGE); p.put(20, 9, BLACK); p.disc(20, 15, 1.3, BEIGE);
    p.rect(1, h - 1, 3, 1, BLACK); p.rect(w - 4, h - 1, 3, 1, BLACK);
    p.line(8, 6, 5, 1, CHROME); p.line(14, 6, 18, 1, CHROME);
    return;
  }
  if (ep === 4) { // tubo preto no rack com videocassete
    blk(p, 0, h - 11, w, 11, C('#3a3a42')); blk(p, 2, h - 9, w - 4, 3, BLACK); p.rect(4, h - 8, 8, 1, DGREY); p.put(w - 5, h - 8, lit ? C('#7af08a') : C('#2a5a2a'));
    p.rect(2, h - 4, w - 4, 1, lv(C('#3a3a42'), 1));
    blk(p, 2, 1, w - 4, h - 12, C('#26262c')); screen(p, 4, 3, w - 8, h - 17, lit, C('#3a6ac8'));
    if (lit) p.rect(6, 6, 6, 4, C('#e85a8a'));
    p.rect(w - 6, h - 14, 3, 1, GREY);
    return;
  }
  // tela plana no rack baixo
  blk(p, 0, h - 7, w, 7, C('#2a2a32')); p.rect(3, h - 5, 8, 2, C('#1a1a20')); p.rect(13, h - 5, 8, 2, C('#1a1a20'));
  p.rect(10, h - 9, 4, 2, C('#1a1a20'));
  blk(p, 0, 2, w, h - 11, C('#111116')); screen(p, 1, 3, w - 2, h - 13, lit, C('#3a4ab8'));
  if (lit) { p.rect(3, 6, 8, 5, C('#e8a040')); p.rect(13, 5, 7, 2, W); p.rect(13, 8, 5, 1, C('#c8c8e0')); }
}

/** Quadro de metas: lousa de ardósia → papel de gráfico emoldurado → lousa verde → cortiça com alvos → quadro branco → vidro com notas. */
function goals(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  hang(p, Math.floor(w / 2), 5, w - 6, 3);
  const surf = [C('#3a3e44'), C('#efe6cc'), C('#2f5a46'), C('#b88a58'), C('#f4f4f0'), C('#c8dce4')][ep];
  const fr = ep === 4 ? C('#b8bcc4') : ep === 5 ? C('#e8eef2') : ep === 3 ? C('#7a5a3a') : pal.woodDark;
  framed(p, 0, 3, w, h - 3, 2, fr, surf);
  const ink = ep === 0 || ep === 2 ? C('#e8e8e0') : ep === 1 ? C('#2a2a3a') : ep === 4 ? C('#2a5ab0') : C('#2a2a3a');
  const lit2 = lit ? lv(ink, 4) : ink;
  // título + 3 metas com caixinha (a primeira marcada) + alvo
  p.hline(4, 14, 6, lit2);
  for (let i = 0; i < 3; i++) {
    const y = 9 + i * 4;
    if (ep === 3 || ep === 5) { p.rect(3, y - 1, 13, 3, [C('#f0e070'), C('#f0a0b8'), C('#a8e0a0')][i]); p.put(4, y, i === 0 ? C('#2a8a3a') : DGREY); p.hline(6, 14 - i, y, DGREY); }
    else { p.rect(4, y - 1, 3, 3, lit2); p.put(5, y, surf); if (i === 0) { p.put(5, y, C('#48b85c')); p.put(6, y - 1, C('#48b85c')); } p.hline(9, 17 - i * 2, y, lit2); }
  }
  // alvo
  const cx = w - 8, cy = Math.floor(h / 2) + 2;
  p.disc(cx, cy, 5, ep === 0 || ep === 2 ? lv(surf, 3.6) : RED); p.disc(cx, cy, 3.4, surf); p.disc(cx, cy, 1.8, ep === 0 || ep === 2 ? lv(surf, 3.6) : RED);
  p.line(cx + 4, cy - 5, cx, cy, lit ? GOLD : DGREY); p.put(cx + 4, cy - 5, lit ? GOLD : C('#8a8a92'));
  if (ep === 0 || ep === 2) p.rect(3, h - 3, 4, 1, W); // giz
  if (ep === 4) p.rect(3, h - 3, 4, 1, C('#2a5ab0'));
}

/** Diário de couro fechado com fecho e fita: castanho com latão → preto → vinho → laranja → agenda de espiral → caderno preto de elástico. */
function diary(d: Dc): void {
  const { p, ep, lit, w, h } = d;
  const cov = [C('#6a3a20'), C('#2a2228'), C('#7a2430'), C('#c8602a'), C('#2a4a7a'), C('#1e1e24')][ep];
  p.rect(1, 2, w - 3, h - 2, lit ? C('#f8f0d8') : PAPER); // páginas (lombada de folhas)
  blk(p, 0, 1, w - 2, h - 2, cov);
  p.vline(1, 1, h - 2, lv(cov, 1.4)); // lombada
  if (ep <= 2) { p.rect(w - 5, 3, 4, 3, ep === 0 ? BRASS : lv(cov, 1.6)); p.put(w - 4, 4, ep === 0 ? lv(BRASS, 5) : BRASS); }
  else if (ep === 4) for (let y = 2; y < h - 2; y += 2) p.put(0, y, CHROME);
  else if (ep === 5) p.vline(w - 5, 1, h - 2, C('#3a3a42'));
  else p.rect(4, 3, 5, 3, lv(cov, 4));
  p.vline(4, h - 1, h, RED); p.put(4, h - 1, RED); p.put(5, h - 1, lv(RED, 1)); // fita
  if (lit) p.hline(2, w - 4, 1, lv(cov, 5));
}

/** Caderno de aprendizados: prateleira de livros com o caderno saindo (marcador para fora). */
function learnbook(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const sh = ep >= 4 ? (ep === 5 ? C('#e8e6e0') : C('#8a8a92')) : pal.woodDark;
  blk(p, 0, h - 3, w, 3, sh);
  p.rect(1, h - 1, 2, 1, lv(sh, 0.6)); p.rect(w - 3, h - 1, 2, 1, lv(sh, 0.6)); // mão-francesa
  const cols = [pal.accent, pal.accent2, pal.fabric, pal.fabric2, C('#3a3a44'), pal.gold];
  let x = 1;
  for (let i = 0; i < 7; i++) {
    const bw = 2 + (i % 2), bh = 9 + Math.floor(noise(i, ep, 5) * 4);
    if (i === 4) { x += 1; continue; }
    p.rect(x, h - 3 - bh, bw, bh, cols[i % cols.length]); p.vline(x, h - 3 - bh, h - 4, lv(cols[i % cols.length], 4)); p.hline(x, x + bw - 1, h - 3 - bh + 2, lv(cols[i % cols.length], 1.6));
    x += bw + (i === 2 ? 0 : 0);
  }
  // o caderno puxado para fora, inclinado, com etiqueta
  const nb = [C('#4a6a3a'), C('#3a5a7a'), C('#c84a3a'), C('#e8a030'), C('#2a8ac8'), C('#e8e0c8')][ep];
  const bx = x + 1;
  p.poly([[bx, h - 3], [bx + 5, h - 3], [bx + 9, h - 15], [bx + 4, h - 15]], lit ? lv(nb, 4) : nb);
  p.line(bx + 4, h - 15, bx, h - 3, lv(nb, 4.6));
  p.rect(bx + 4, h - 10, 3, 2, W); // etiqueta
  if (ep === 4 || ep === 5) for (let y = h - 13; y < h - 4; y += 2) p.put(bx + 1 + Math.floor((h - 3 - y) / 3), y, ep === 5 ? DGREY : CHROME);
  p.vline(bx + 7, h - 18, h - 14, GOLD); p.put(bx + 7, h - 18, lv(GOLD, 5)); // marcador
  // um livro deitado na ponta
  p.rect(w - 9, h - 5, 8, 2, pal.accent); p.hline(w - 9, w - 2, h - 5, lv(pal.accent, 4)); p.rect(w - 8, h - 7, 6, 2, pal.fabric2);
}

/** Porta-retratos de mesa: oval sépia em moldura dourada → retângulo prateado → p&b em madeira → cor desbotada → cor em preto → digital aceso. */
function photo(d: Dc): void {
  const { p, ep, lit, w, h } = d;
  const fr = [GOLD, CHROME, C('#8a5a30'), C('#e07a2a'), C('#2a2a30'), C('#1e1e24')][ep];
  const pic = [C('#c8a878'), C('#b8a488'), C('#a8a8a8'), C('#d8b088'), C('#88b8e0'), lit ? C('#9ad0f0') : C('#4a6a8a')][ep];
  blk(p, 0, 0, w, h - 1, fr);
  if (ep === 0) { p.rect(0, 0, w, h - 1, 0); p.ellipse(w / 2, (h - 1) / 2, w / 2 - 0.5, (h - 1) / 2 - 0.5, fr); p.ellipse(w / 2, (h - 1) / 2, w / 2 - 2.2, (h - 1) / 2 - 2.2, pic); }
  else p.rect(2, 2, w - 4, h - 5, pic);
  const tone = (c: Col) => (ep <= 1 ? mix(c, C('#a07a50'), 0.6) : ep === 2 ? mix(c, C('#8a8a8a'), 0.8) : c);
  bust(p, 2, 6, tone(SKIN[0]), tone(C('#3a5aa0')), tone(C('#3a2616')));
  bust(p, 6, 5, tone(SKIN[1]), tone(C('#b03a4a')), tone(C('#1e1814')));
  p.line(w - 3, h - 1, w - 1, h - 5, lv(fr, 1)); // pé do porta-retratos
  if (ep === 5) p.put(w - 3, h - 3, lit ? C('#7af08a') : DGREY);
}

// ---------------------------------------------------------------- sede · reunião e A&R

/** Quadro branco: lousa no cavalete → lousa de parede → lousa verde → quadro branco com canetas → com ímãs e post-its → tela de toque. */
function whiteboard(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const easel = ep === 0;
  const bh = easel ? h - 8 : h - 2;
  if (easel) { p.line(6, 2, 2, h - 1, pal.woodDark); p.line(w - 7, 2, w - 3, h - 1, pal.woodDark); p.line(Math.floor(w / 2), 0, Math.floor(w / 2), h - 2, lv(pal.woodDark, 1)); }
  else if (ep !== 5) hang(p, Math.floor(w / 2), 6, w - 7, 2);
  const surf = [C('#2e3236'), C('#2a2e30'), C('#2f5a46'), C('#f4f4f0'), C('#f8f8f4'), lit ? C('#2a3a6a') : C('#1e2436')][ep];
  const fr = ep >= 3 ? (ep === 5 ? C('#111116') : C('#b8bcc4')) : pal.woodDark;
  const y0 = easel ? 1 : 2;
  framed(p, 0, y0, w, bh - y0 + (easel ? 0 : 1) - 1, 2, fr, surf);
  const chalk = ep < 3 ? C('#e8e8e0') : ep === 5 ? C('#9adcff') : C('#2a5ab0');
  // colunas de lançamento: três títulos e riscos
  for (let c = 0; c < 3; c++) {
    const x = 4 + c * 13;
    p.hline(x, x + 7, y0 + 4, chalk);
    if (c < 2) p.vline(x + 11, y0 + 4, bh - 6, withAlpha(chalk, 140));
    if (ep >= 4) { // post-its
      for (let i = 0; i < 2 - (c === 2 ? 1 : 0); i++) { const pc = [C('#f8e070'), C('#a8d8f8'), C('#a8e098')][c]; p.rect(x, y0 + 7 + i * 7, 9, 5, pc); p.hline(x + 1, x + 6, y0 + 9 + i * 7, lv(pc, 1)); p.put(x + 4, y0 + 7 + i * 7, RED); }
    } else for (let i = 0; i < 3; i++) p.hline(x, x + 5 - i, y0 + 8 + i * 4, withAlpha(chalk, 200));
  }
  if (ep === 5 && lit) p.rect(30, y0 + 7, 9, 6, C('#e8a040'));
  // bandeja com giz/canetas
  const ty = bh - 3 + (easel ? 0 : 1);
  p.rect(1, ty, w - 2, 2, ep >= 3 ? C('#9a9ea8') : lv(pal.woodDark, 2.6));
  if (ep < 3) { p.rect(5, ty - 1, 3, 1, W); p.rect(10, ty - 1, 2, 1, C('#f0e0a0')); p.rect(w - 9, ty - 2, 5, 2, C('#c8a878')); }
  else if (ep < 5) { p.rect(5, ty - 1, 4, 1, C('#2a5ab0')); p.rect(10, ty - 1, 4, 1, RED); p.rect(15, ty - 1, 4, 1, C('#2a8a3a')); p.rect(w - 9, ty - 2, 5, 2, W); }
  if (ep === 4) { p.disc(w - 4, y0 + 4, 1.4, RED); p.disc(3.5, bh - 7, 1.4, C('#3a6ac8')); }
  if (lit && ep < 5) p.rect(2, y0 + 2, w - 4, bh - y0 - 4, withAlpha(GLOW, 30));
}

/** Mesa de reunião: carvalho escuro com cadeiras de espaldar → art déco → teca com cadeiras concha → nogueira com laranja → laminado cinza com cadeiras pretas → branca com cadeiras brancas. */
function meeting(d: Dc): void {
  const { p, ep, lit, w, h } = d;
  const top = [C('#4a2418'), C('#6a3a24'), C('#a8703e'), C('#7a4a2a'), C('#a8a8b0'), C('#f0f0ec')][ep];
  const ch = [C('#6a2a2a'), C('#2a4a3a'), C('#d8564a'), C('#e07a2a'), C('#2a2a30'), C('#e8e8ec')][ep];
  const ty = h - 11;
  // cadeiras de trás (espaldares acima da mesa)
  for (let i = 0; i < 4; i++) {
    const x = 8 + i * 12;
    if (ep === 2) p.ellipse(x + 3, ty - 3, 4, 3, ch); else blk(p, x, ty - (ep === 0 ? 9 : 6), 7, ep === 0 ? 9 : 6, ch);
    if (ep === 0) p.rect(x + 2, ty - 7, 3, 4, lv(ch, 2));
  }
  blk(p, 0, ty, w, 3, top); p.hline(0, w - 1, ty + 3, lv(top, 1));
  // pés
  if (ep === 0) { blk(p, 3, ty + 3, 4, h - ty - 3, lv(top, 2)); blk(p, w - 7, ty + 3, 4, h - ty - 3, lv(top, 2)); p.rect(2, h - 1, 6, 1, lv(top, 1)); p.rect(w - 8, h - 1, 6, 1, lv(top, 1)); }
  else if (ep === 1) { blk(p, Math.floor(w / 2) - 6, ty + 3, 12, h - ty - 3, lv(top, 2.4)); p.hline(Math.floor(w / 2) - 4, Math.floor(w / 2) + 3, ty + 6, GOLD); }
  else if (ep === 5) { p.vline(4, ty + 3, h - 1, CHROME); p.vline(w - 5, ty + 3, h - 1, CHROME); }
  else { p.line(4, ty + 3, 2, h - 1, lv(top, 1.4)); p.line(w - 5, ty + 3, w - 3, h - 1, lv(top, 1.4)); }
  // cadeiras da ponta
  blk(p, -1 + 1, ty + 1, 3, h - ty - 1, lv(ch, 2)); blk(p, w - 3, ty + 1, 3, h - ty - 1, lv(ch, 2));
  // jarra, papéis, aparelho
  p.rect(10, ty - 1, 6, 1, W); p.rect(30, ty - 1, 5, 1, W);
  if (ep <= 2) { p.rect(22, ty - 4, 3, 4, withAlpha(C('#c8e0f0'), 200)); p.hline(22, 24, ty - 4, W); }
  else if (ep === 3) { p.rect(22, ty - 2, 5, 2, BLACK); p.put(23, ty - 2, LED); }
  else if (ep === 4) { p.poly([[21, ty - 1], [27, ty - 1], [25, ty - 3], [23, ty - 3]], DGREY); }
  else { p.rect(21, ty - 1, 6, 1, C('#2a2a30')); p.hline(22, 25, ty - 2, lit ? SCR : C('#3a4a6a')); }
  if (lit) p.hline(1, w - 2, ty, lv(top, 5));
}

/** Maquete do prédio sob redoma: tijolo de 3 andares → torre art déco → caixa modernista → concreto bruto → torre de vidro → torre curva com teto verde. */
function model(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const ped = ep >= 4 ? C('#e8e6e0') : pal.woodDark;
  blk(p, 3, h - 12, w - 6, 12, ped); p.rect(2, h - 13, w - 4, 2, lv(ped, 3.6)); p.hline(5, w - 6, h - 6, lv(ped, 1.6));
  p.rect(4, h - 15, w - 8, 2, C('#7a9a5a')); // base com grama
  const by = h - 15, cx = Math.floor(w / 2);
  const win = lit ? GLOW : C('#3a4a6a');
  if (ep === 0) { blk(p, cx - 6, by - 11, 12, 11, C('#a8503a')); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) p.put(cx - 4 + c * 4, by - 9 + r * 3, win); p.rect(cx - 6, by - 13, 12, 2, C('#5a3a2a')); }
  else if (ep === 1) { blk(p, cx - 6, by - 7, 12, 7, C('#d8c8a0')); blk(p, cx - 4, by - 12, 8, 5, C('#d8c8a0')); blk(p, cx - 2, by - 16, 4, 4, C('#d8c8a0')); p.vline(cx, by - 19, by - 16, GOLD); for (let y = by - 11; y < by; y += 2) p.put(cx - 1, y, win); for (let y = by - 6; y < by; y += 2) { p.put(cx - 4, y, win); p.put(cx + 3, y, win); } }
  else if (ep === 2) { blk(p, cx - 7, by - 12, 14, 12, C('#e8e4d8')); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) p.rect(cx - 6 + c * 3, by - 10 + r * 3, 2, 2, win); p.rect(cx - 7, by - 2, 14, 2, C('#7aa0b0')); p.rect(cx - 1, by - 2, 2, 2, DARK); }
  else if (ep === 3) { blk(p, cx - 7, by - 9, 14, 9, C('#9a968e')); blk(p, cx - 5, by - 14, 10, 5, C('#8a867e')); for (let c = 0; c < 4; c++) p.rect(cx - 6 + c * 4, by - 7, 2, 2, win); p.rect(cx - 3, by - 12, 6, 1, win); }
  else if (ep === 4) { blk(p, cx - 5, by - 17, 10, 17, C('#4a7ab0')); for (let y = by - 15; y < by; y += 2) p.hline(cx - 4, cx + 3, y, lit ? GLOW : C('#7ab0e0')); p.vline(cx, by - 20, by - 17, CHROME); }
  else { p.poly([[cx - 5, by], [cx + 5, by], [cx + 3, by - 18], [cx - 2, by - 18]], C('#a8d0e0')); for (let y = by - 16; y < by; y += 3) p.hline(cx - 4 + Math.floor((by - y) / 9), cx + 3, y, lit ? GLOW : C('#6a9ab8')); p.rect(cx - 2, by - 19, 6, 1, C('#48b85c')); }
  // redoma de vidro
  p.ellipse(cx, by - 8, w / 2 - 2, 12, withAlpha(C('#c8e8f8'), 60));
  p.line(cx - 7, by - 14, cx - 5, by - 18, withAlpha(W, 200)); p.put(cx - 8, by - 11, withAlpha(W, 200));
  p.rect(4, by - 1, w - 8, 1, withAlpha(C('#c8e8f8'), 110));
  // plaquinha
  p.rect(cx - 3, h - 9, 6, 2, BRASS);
}

/** Mural de cortiça com retratos presos por tachinha (cartões sépia → p&b → polaroids coloridas) e o fio vermelho. */
function cork(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  hang(p, Math.floor(w / 2), 6, w - 7, 2);
  const fr = ep === 5 ? C('#2a2a30') : ep === 4 ? C('#c8a878') : pal.woodDark;
  blk(p, 0, 2, w, h - 2, fr);
  const cork0 = C('#b88a58');
  for (let y = 4; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { const n = noise(x, y, 17); p.set(x, y, n < 0.18 ? lv(cork0, 2) : n > 0.86 ? lv(cork0, 4) : cork0); }
  const photoC = ep === 0 ? C('#d8c49a') : ep === 1 ? C('#e0d4b4') : W;
  const pins = [RED, C('#2a8a4a'), C('#e0c040'), C('#3a6ac8'), RED];
  const pos: [number, number][] = [[4, 6], [14, 5], [25, 7], [6, 15], [19, 15]];
  pos.forEach(([x, y], i) => {
    const pw = 7, ph = 8;
    p.rect(x + 1, y + 1, pw, ph, withAlpha(C('#3a2010'), 90)); // sombra
    p.rect(x, y, pw, ph, ep === 5 ? lv(photoC, 2.6) : photoC); // 2010+: foto impressa, sem a borda larga da polaroid
    const pic = ep <= 1 ? C('#9a7a5a') : ep === 2 ? C('#6a6a6a') : [C('#3a5aa0'), C('#b03a4a'), C('#2a7a5a'), C('#8a4ab0'), C('#c87a2a')][i];
    p.rect(x + 1, y + 1, pw - 2, ph - 3, pic);
    const sk = ep <= 1 ? C('#c8a878') : ep === 2 ? C('#b8b8b8') : SKIN[i % 3];
    p.rect(x + 2, y + 2, 3, 2, sk); p.rect(x + 2, y + 4, 3, 1, lv(pic, 1.6));
    p.put(x + 3, y, pins[i]); p.put(x + 3, y - 1, lv(pins[i], 4.6));
  });
  p.line(7, 6, 17, 5, RED); // fio entre dois artistas
  // bilhete amarelo
  p.rect(w - 9, h - 10, 7, 6, C('#f0e070')); p.hline(w - 8, w - 4, h - 8, lv(C('#f0e070'), 1)); p.hline(w - 8, w - 5, h - 6, lv(C('#f0e070'), 1));
  if (lit) p.rect(2, 4, w - 4, h - 6, withAlpha(GLOW, 30));
}

/** Quadro de planejamento: grade de giz com tiras de papel → tábua de pinos → quadro de cartões T → magnético → branco com ímãs → tela de parede. */
function planning(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  if (ep !== 5) hang(p, Math.floor(w / 2), 6, w - 7, 2);
  const surf = [C('#2e3236'), C('#c8a878'), C('#e8e4d8'), C('#f0ece4'), C('#f8f8f4'), lit ? C('#1e2a48') : C('#141a2c')][ep];
  const fr = ep >= 3 ? (ep === 5 ? C('#111116') : C('#b8bcc4')) : pal.woodDark;
  framed(p, 0, 2, w, h - 2, 2, fr, surf);
  const grid = ep === 0 ? withAlpha(C('#e8e8e0'), 150) : ep === 5 ? C('#2a3a5a') : lv(surf, 2);
  const x0 = 10, y0 = 7, cols = 6, cw = Math.floor((w - x0 - 3) / cols), rows = 4, rh = Math.floor((h - y0 - 3) / rows);
  p.rect(2, 4, w - 4, 3, ep === 0 ? lv(surf, 3.4) : ep === 5 ? C('#2a3a6a') : lv(surf, 2.6));
  p.rect(3 + Math.floor(cw / 2), 4, cw, 3, C('#e8b850')); // mês atual
  for (let c = 0; c <= cols; c++) p.vline(x0 + c * cw, 4, h - 3, grid);
  for (let r = 0; r <= rows; r++) p.hline(2, w - 3, y0 + r * rh, grid);
  for (let r = 0; r < rows; r++) { p.rect(3, y0 + r * rh + 1, 5, rh - 2, ep === 5 ? C('#3a4a6a') : lv(surf, 2.8)); p.put(4, y0 + r * rh + 2, SKIN[r % 3]); }
  const cards: [number, number, number, Col][] = [[0, 0, 2, C('#a8d0f8')], [3, 0, 2, C('#f0d070')], [0, 1, 2, C('#f0a070')], [2, 1, 1, C('#a8e098')], [3, 1, 2, C('#a8d0f8')], [1, 2, 1, C('#a8d0f8')], [2, 2, 2, C('#f0a070')], [0, 3, 1, C('#d8b0f0')], [2, 3, 1, C('#a8d0f8')], [4, 3, 1, C('#f0d070')]];
  for (const [c, r, span, col] of cards) {
    const x = x0 + c * cw + 1, y = y0 + r * rh + 1, cw2 = span * cw - 1, ch2 = rh - 1;
    const cc = ep === 0 ? lv(col, 4.4) : ep === 5 ? (lit ? col : lv(col, 2)) : col;
    p.rect(x, y, cw2, ch2, cc); p.hline(x, x + cw2 - 1, y, lv(cc, 1.6));
    if (ep === 1) p.put(x + 1, y + 1, BRASS);
    if (ep === 4) p.put(x + Math.floor(cw2 / 2), y, RED);
  }
  // conflito em vermelho
  p.ring(x0 + 2 * cw + 0.5 + cw / 2, y0 + 2 * rh + rh / 2 + 0.5, Math.min(cw, rh) / 2 + 1, RED);
}

/** Mesa do olheiro: caderno espiral aberto e o aparelho de ouvir da época (cilindro, gramofone, toca-discos, toca-fitas, discman, notebook) com fone. */
function scoutdesk(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const top = ep >= 4 ? (ep === 5 ? C('#e8e6e0') : C('#a8a8b0')) : pal.wood;
  const ty = h - 12;
  blk(p, 0, ty, w, 3, top);
  p.rect(2, ty + 3, 2, h - ty - 3, lv(top, 1.4)); p.rect(w - 4, ty + 3, 2, h - ty - 3, lv(top, 1.4));
  blk(p, w - 14, ty + 3, 10, 5, lv(top, 2.4)); p.put(w - 9, ty + 5, ep >= 4 ? CHROME : BRASS);
  // caderno espiral aberto
  p.rect(2, ty - 2, 13, 2, W); p.rect(2, ty - 2, 6, 2, lv(W, 3.2)); for (let x = 3; x < 14; x += 2) p.put(x, ty - 2, lv(C('#5a8ac8'), 2));
  p.vline(8, ty - 3, ty - 1, DGREY);
  pen(p, 14, ty - 1, ep);
  // aparelho
  const ax = 18;
  if (ep === 0) { blk(p, ax, ty - 5, 9, 5, pal.woodDark); p.rect(ax + 2, ty - 8, 4, 3, C('#3a2a1a')); p.line(ax + 6, ty - 8, ax + 12, ty - 14, BRASS); p.ellipse(ax + 13, ty - 15, 3, 2, C('#c89a3a')); }
  else if (ep === 1) { blk(p, ax, ty - 5, 11, 5, C('#3a2a24')); p.ellipse(ax + 5, ty - 5, 4, 1, BLACK); p.line(ax + 9, ty - 6, ax + 7, ty - 9, CHROME); }
  else if (ep === 2) { blk(p, ax, ty - 5, 13, 5, C('#c8bca0')); p.ellipse(ax + 6, ty - 5, 5, 1.2, BLACK); p.put(ax + 6, ty - 6, RED); p.line(ax + 11, ty - 6, ax + 8, ty - 7, CHROME); }
  else if (ep === 3) { blk(p, ax, ty - 6, 13, 6, C('#3a3a3a')); p.rect(ax + 2, ty - 5, 6, 3, C('#5a4a3a')); p.disc(ax + 4, ty - 3.5, 0.9, BLACK); p.disc(ax + 6, ty - 3.5, 0.9, BLACK); p.rect(ax + 9, ty - 5, 3, 2, lit ? LED : lv(LED, 1)); }
  else if (ep === 4) { p.ellipse(ax + 5, ty - 1, 5, 1.6, C('#a8acb8')); p.disc(ax + 5, ty - 1.5, 1.2, C('#e8ecf4')); p.rect(ax + 9, ty - 9, 3, 5, BLACK); p.rect(ax + 10, ty - 8, 1, 3, lit ? SCR : DGREY); }
  else { p.poly([[ax, ty - 1], [ax + 12, ty - 1], [ax + 11, ty - 9], [ax + 1, ty - 9]], C('#c8ccd4')); screen(p, ax + 2, ty - 8, 8, 5, lit, C('#3a3a48')); if (lit) for (let i = 0; i < 6; i++) p.vline(ax + 3 + i, ty - 4 - ((i * 3) % 4), ty - 4, C('#48b85c')); }
  // fone de ouvido (a partir dos anos 50)
  if (ep >= 2) { p.ring(w - 4, ty - 4, 3, DGREY); p.rect(w - 8, ty - 3, 2, 3, BLACK); p.rect(w - 2, ty - 3, 2, 3, BLACK); p.rect(w - 7, ty - 5, 7, 1, 0); }
  // pilha de fichas
  p.rect(w - 10, ty - 1, 5, 1, PAPER); p.rect(w - 11, ty - 2, 5, 1, lv(PAPER, 2.8));
}

/** Pilha de demos: cilindros de cera em tubos → discos de goma-laca em envelope → caixas de fita → fitas cassete → CDs → pen drives e cartões. */
function demos(d: Dc): void {
  const { p, ep, lit, h } = d;
  const tag = (x: number, y: number) => p.rect(x, y, 3, 1, W);
  if (ep === 0) {
    const tube = C('#c8a060');
    for (let i = 0; i < 4; i++) { const x = 1 + i * 4, hh = 10 - (i % 2) * 2; p.rect(x, h - hh, 3, hh, tube); p.hline(x, x + 2, h - hh, lv(tube, 4.4)); p.vline(x + 2, h - hh + 1, h - 1, lv(tube, 2)); tag(x, h - hh + 3); }
    p.rect(1, h - 3, 6, 3, C('#2a2026')); p.ellipse(4, h - 3, 3, 1, C('#5a3a2a')); // um cilindro deitado
    return;
  }
  if (ep === 1) {
    for (let i = 0; i < 4; i++) { const y = h - 3 - i * 3, c = [C('#d8c49a'), C('#c8b088'), C('#e0d4b4'), C('#b8a07a')][i]; p.rect(1 + (i % 2), y, 15, 3, c); p.hline(1 + (i % 2), 15 + (i % 2), y, lv(c, 4)); p.disc(8.5 + (i % 2), y + 1.5, 1, BLACK); }
    p.rect(14, h - 14, 5, 2, W);
    return;
  }
  if (ep === 2) {
    for (let i = 0; i < 3; i++) { const y = h - 4 - i * 4, c = [C('#d8d0b8'), C('#c8a878'), C('#e8e0c8')][i]; blk(p, 1 + i, y, 15 - i, 4, c); p.disc(8 + i * 0.5, y + 2, 1.2, lv(c, 1.4)); tag(3 + i, y + 1); }
    return;
  }
  if (ep === 3) {
    for (let i = 0; i < 5; i++) { const y = h - 3 - i * 3, x = 1 + ((i * 3) % 4), c = [C('#2a2a30'), C('#e8e0d0'), C('#c83a32'), C('#2a2a30'), C('#e8a030')][i]; p.rect(x, y, 13, 3, c); p.hline(x, x + 12, y, lv(c, 4)); p.rect(x + 3, y + 1, 7, 1, i % 2 ? DGREY : W); }
    return;
  }
  if (ep === 4) {
    for (let i = 0; i < 5; i++) { const y = h - 2 - i * 2, x = 1 + (i % 2); p.rect(x, y, 14, 2, withAlpha(C('#c8d0d8'), 220)); p.hline(x, x + 13, y, W); p.put(x + 1, y + 1, [RED, C('#3a6ac8'), C('#e0c040'), C('#2a8a4a'), C('#8a4ab0')][i]); }
    p.disc(14, h - 13, 3, C('#d8dce4')); p.disc(14, h - 13, 1, C('#9aa0aa'));
    return;
  }
  // pen drives num pote e um tablet com a onda sonora
  blk(p, 1, h - 8, 7, 8, C('#c8a878')); for (let i = 0; i < 3; i++) p.rect(2 + i * 2, h - 11 - (i % 2), 1, 4, [RED, C('#3a6ac8'), C('#2a8a4a')][i]);
  blk(p, 9, h - 9, 10, 9, BLACK); screen(p, 10, h - 8, 8, 7, lit, C('#2a2a48'));
  for (let i = 0; i < 7; i++) p.vline(11 + i, h - 5 - ((i * 5) % 3), h - 4 + ((i * 5) % 2), lit ? C('#ff7ac8') : C('#7a5a8a'));
}

// ---------------------------------------------------------------- sede · corredor e recepção

/** Estante de troféus envidraçada: taças e medalhas → placas → disco de ouro → disco de platina → prêmio de vidro com luz. */
function trophies(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const wood = ep >= 4 ? (ep === 5 ? C('#2a2a30') : C('#5a3a2a')) : ep === 1 ? C('#3a2a24') : pal.woodDark;
  blk(p, 0, 0, w, h, wood);
  if (ep === 1) { p.rect(2, 0, w - 4, 1, GOLD); } // filete art déco
  const inner = lit ? mix(lv(wood, 1.4), GLOW, 0.25) : lv(wood, 1.2);
  p.rect(2, 2, w - 4, h - 8, inner);
  const shelves = [2 + 9, 2 + 19];
  for (const y of shelves) p.rect(2, y, w - 4, 1, lv(wood, 3.6));
  // fileira de cima: taças
  const cup = (x: number, y: number, c: Col) => { p.rect(x, y - 1, 5, 1, lv(c, 1)); p.rect(x + 2, y - 3, 1, 2, c); p.poly([[x, y - 8], [x + 5, y - 8], [x + 4, y - 4], [x + 1, y - 4]], c); p.vline(x, y - 8, y - 6, lv(c, 5)); };
  cup(4, shelves[0], GOLD); cup(12, shelves[0], CHROME); cup(20, shelves[0], C('#d08848'));
  // fileira do meio: placa/disco da época
  if (ep <= 1) { blk(p, 4, shelves[1] - 8, 8, 8, pal.wood); p.rect(6, shelves[1] - 6, 4, 3, GOLD); blk(p, 15, shelves[1] - 7, 9, 7, pal.wood); p.disc(19.5, shelves[1] - 3.5, 2, GOLD); }
  else {
    const disc = (x: number, c: Col) => { blk(p, x, shelves[1] - 9, 10, 9, BLACK); p.disc(x + 5, shelves[1] - 4.5, 3.4, c); p.disc(x + 5, shelves[1] - 4.5, 1, RED); p.put(x + 3, shelves[1] - 7, lv(c, 5)); };
    disc(3, GOLD); disc(15, ep >= 4 ? C('#e8ecf4') : GOLD);
  }
  // fileira de baixo: estatueta ou prêmio da época
  const by = h - 7;
  if (ep === 5) { p.poly([[10, by], [16, by], [15, by - 9], [11, by - 9]], withAlpha(C('#c8f0ff'), 210)); p.vline(12, by - 8, by - 2, W); }
  else { p.rect(9, by - 2, 7, 2, BLACK); p.rect(12, by - 9, 2, 7, GOLD); p.disc(13, by - 10, 1.4, GOLD); p.line(11, by - 7, 15, by - 7, GOLD); }
  p.rect(3, by - 3, 4, 3, C('#3a6ac8')); p.disc(5, by - 5, 1.4, GOLD);
  // vidro e pés
  p.line(4, 3, 8, 3 + 4, withAlpha(W, 120)); p.line(w - 10, 12, w - 6, 16, withAlpha(W, 120));
  p.vline(Math.floor(w / 2), 2, h - 7, lv(wood, 2.4));
  blk(p, 1, h - 6, w - 2, 6, lv(wood, 2.6)); p.put(Math.floor(w / 2) - 2, h - 4, BRASS); p.put(Math.floor(w / 2) + 1, h - 4, BRASS);
}

/** Chaveiro "suas casas": tábua com ganchos e uma chave por casa (chave de ferro → latão → com etiqueta → etiqueta colorida → controle do carro → cartão e chaveiro). */
function keys(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const board = ep >= 4 ? (ep === 5 ? C('#e8e6e0') : C('#8a8a92')) : pal.wood;
  blk(p, 0, 0, w, 6, board); p.put(2, 2, DGREY); p.put(w - 3, 2, DGREY); // parafusos
  const metal = ep === 0 ? C('#5a5a62') : ep === 1 ? BRASS : CHROME;
  const tags = [RED, C('#3a6ac8'), C('#2a8a4a')];
  for (let i = 0; i < 3; i++) {
    const x = 3 + i * 6;
    p.rect(x, 5, 1, 2, DGREY); // gancho
    p.ring(x + 0.5, 8.5, 1.4, metal);
    if (ep === 5 && i === 2) { blk(p, x - 2, 10, 5, 4, C('#2a2a30')); p.rect(x - 1, 11, 3, 1, lit ? SCR : DGREY); continue; }
    if (ep === 4 && i === 1) { blk(p, x - 1, 10, 4, 5, BLACK); p.put(x, 11, lit ? LED : DGREY); continue; }
    p.vline(x, 10, h - 2, metal); p.hline(x + 1, x + 2, h - 3, metal); p.put(x + 1, h - 5, metal);
    if (ep >= 2) { p.rect(x + 1, 10, 3, 3, ep === 2 ? PAPER : tags[i]); p.put(x + 2, 11, ep === 2 ? DGREY : lv(tags[i], 4)); }
    if (ep === 0) p.ring(x + 0.5, 8.5, 2, lv(metal, 2));
  }
  if (lit) p.hline(1, w - 2, 0, lv(board, 5));
}

// ---------------------------------------------------------------- casa

/** Espelho de corpo inteiro: de cavalete oval → art déco escalonado → moldura de teca → plástico laranja → moldura preta fina → espelho com luz de LED. */
function mirror(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const fr = [pal.woodDark, C('#c8b890'), C('#8a5a30'), C('#e07a2a'), C('#2a2a30'), C('#e8e8ec')][ep];
  const glass = lit ? C('#d8f0f8') : C('#a8c8d8');
  const mh = h - (ep === 0 ? 5 : 2);
  if (ep === 0) { // cavalete
    p.ellipse(w / 2, mh / 2, w / 2 - 1, mh / 2 - 0.5, fr); p.ellipse(w / 2, mh / 2, w / 2 - 3, mh / 2 - 2.5, glass);
    p.vline(1, mh / 2, h - 1, fr); p.vline(w - 2, mh / 2, h - 1, fr); p.hline(0, 3, h - 1, fr); p.hline(w - 4, w - 1, h - 1, fr);
  } else {
    blk(p, 0, 0, w, mh, fr); p.rect(2, 2, w - 4, mh - 4, glass);
    if (ep === 1) { p.rect(0, 0, w, 2, lv(fr, 4)); p.rect(3, 0, w - 6, 1, lv(fr, 5)); }
    if (ep === 5) { p.rect(1, 1, w - 2, 1, lit ? W : C('#f8f0d8')); p.rect(1, mh - 2, w - 2, 1, lit ? W : C('#f8f0d8')); }
    p.rect(2, mh, 2, h - mh, lv(fr, 1)); p.rect(w - 4, mh, 2, h - mh, lv(fr, 1));
  }
  // reflexo: faixas diagonais
  p.line(4, 8, 8, 4, withAlpha(W, 200)); p.line(4, 12, 11, 5, withAlpha(W, 140)); p.line(w - 6, mh - 8, w - 4, mh - 10, withAlpha(W, 160));
  if (lit) p.rect(3, 3, w - 6, mh - 6, withAlpha(W, 40));
}

/** Cama vista de lado: ferro com bolas de latão e colcha → madeira → teca → cabeceira acolchoada laranja → futon preto → plataforma com luz. */
function bed(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const fr = [C('#2a2a30'), pal.woodDark, C('#a8703e'), C('#c8602a'), C('#2a2a30'), C('#d8d4cc')][ep];
  const blanket = [C('#8a2430'), C('#3f5a3a'), C('#78b8ac'), C('#e8a030'), C('#2a4a7a'), C('#a8b8c8')][ep];
  const my = h - 9;
  // cabeceira e peseira
  if (ep === 0) { p.vline(1, 2, h - 1, fr); p.vline(5, 4, my, fr); for (let x = 2; x < 5; x++) p.vline(x, 4, my, x % 2 ? fr : 0); p.hline(1, 6, 4, fr); p.disc(1.5, 2, 1.4, BRASS); p.vline(w - 2, my - 4, h - 1, fr); p.disc(w - 1.5, my - 5, 1.4, BRASS); }
  else if (ep === 3) { blk(p, 0, 2, 7, h - 3, fr); for (let y = 4; y < my; y += 4) p.hline(1, 5, y, lv(fr, 2)); }
  else if (ep === 4) { blk(p, 0, my - 4, 3, h - my + 4, fr); }
  else if (ep === 5) { blk(p, 0, 4, 6, my - 2, C('#8a8a92')); p.vline(6, 4, my, lit ? GLOW : C('#f0e0b0')); }
  else { blk(p, 0, 3, 5, h - 3, fr); blk(p, w - 4, my - 3, 4, h - my + 3, fr); }
  // estrado/colchão/colcha
  const base = ep === 5 ? fr : ep === 4 ? fr : lv(fr, 2.4);
  blk(p, 2, my + 2, w - 4, ep >= 4 ? 4 : 3, base);
  if (ep <= 3 && ep !== 0) { p.rect(4, my + 5, 2, h - my - 5, fr); p.rect(w - 7, my + 5, 2, h - my - 5, fr); }
  if (ep === 0) { p.rect(4, my + 5, 1, h - my - 5, fr); p.rect(w - 5, my + 5, 1, h - my - 5, fr); }
  if (ep === 5) p.hline(3, w - 4, h - 1, lit ? GLOW : C('#f0e0b0'));
  blk(p, 4, my - 2, w - 8, 4, W); // lençol
  blk(p, 14, my - 4, w - 18, 6, blanket);
  if (ep === 0 || ep === 1) for (let x = 16; x < w - 5; x += 4) p.rect(x, my - 2, 2, 2, lv(blanket, 4)); // colcha de retalhos
  p.hline(14, w - 5, my - 4, lv(blanket, 4.4));
  blk(p, 6, my - 5, 8, 4, C('#f4f0e8')); // travesseiro
  if (lit) p.hline(15, w - 6, my - 3, lv(blanket, 5));
}

/** Escrivaninha de compor: secretária de tampa com escaninhos → mesa com partitura → teca → gravador de 4 canais → teclado e PC → notebook e teclado MIDI. */
function writedesk(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const wood = [pal.woodDark, C('#6a3a24'), C('#a8703e'), C('#8a5a30'), C('#8a8a92'), C('#e8e6e0')][ep];
  const ty = h - 13;
  // estante em cima (hutch)
  if (ep <= 1) {
    blk(p, 1, 0, w - 2, ty, wood);
    for (let i = 0; i < 4; i++) { p.rect(3 + i * 7, 2, 5, 6, lv(wood, 1)); p.rect(4 + i * 7, 4, 3, 4, i % 2 ? PAPER : lv(PAPER, 2.6)); }
    p.rect(3, 10, w - 6, ty - 11, lv(wood, 1.4));
    if (ep === 0) { p.rect(5, ty - 4, 3, 3, BLACK); p.line(7, ty - 4, 9, ty - 9, W); } // tinteiro e pena
    else { p.poly([[10, ty - 1], [20, ty - 1], [19, ty - 8], [11, ty - 8]], W); for (let y = ty - 7; y < ty - 1; y += 2) p.hline(11, 18, y, GREY); p.put(14, ty - 5, BLACK); p.put(16, ty - 4, BLACK); }
  } else {
    blk(p, 2, 2, w - 4, 3, wood); p.rect(3, 5, 1, ty - 5, lv(wood, 1.4)); p.rect(w - 4, 5, 1, ty - 5, lv(wood, 1.4));
    p.rect(5, -0 + 0, 3, 2, C('#3a6ac8')); p.rect(9, 0, 2, 2, RED); p.rect(12, 0, 4, 2, GOLD);
    if (ep === 2) { p.poly([[8, ty - 1], [18, ty - 1], [17, ty - 9], [9, ty - 9]], W); for (let y = ty - 8; y < ty - 1; y += 2) p.hline(9, 16, y, GREY); p.vline(22, ty - 9, ty - 1, BLACK); p.poly([[20, ty - 11], [26, ty - 11], [25, ty - 8], [21, ty - 8]], C('#d85a4a')); if (lit) d.fx.poly([[21, ty - 8], [25, ty - 8], [28, ty], [18, ty]], withAlpha(GLOW, 70)); }
    else if (ep === 3) { blk(p, 5, ty - 6, 16, 6, C('#2a2a30')); p.disc(9, ty - 4, 2, C('#5a4a3a')); p.disc(16, ty - 4, 2, C('#5a4a3a')); p.put(9, ty - 4, BLACK); p.put(16, ty - 4, BLACK); for (let i = 0; i < 4; i++) p.vline(20 + i * 2, ty - 5, ty - 2, lit ? GLOW : GREY); p.rect(5, ty - 7, 16, 1, CHROME); }
    else if (ep === 4) { blk(p, 6, ty - 12, 12, 10, C('#d8d0bc')); screen(p, 8, ty - 10, 8, 6, lit); p.rect(4, ty - 2, 20, 2, W); for (let x = 5; x < 23; x += 2) p.put(x, ty - 2, BLACK); }
    else { p.poly([[6, ty - 1], [16, ty - 1], [15, ty - 9], [7, ty - 9]], C('#c8ccd4')); screen(p, 8, ty - 8, 6, 5, lit, C('#5a6ad8')); p.rect(17, ty - 2, 12, 2, BLACK); for (let x = 18; x < 28; x += 2) p.put(x, ty - 2, W); p.put(18, ty - 3, lit ? C('#7af08a') : DGREY); }
  }
  blk(p, 0, ty, w, 3, wood);
  blk(p, 1, ty + 3, 10, h - ty - 3, lv(wood, 2.4)); p.put(6, ty + 6, BRASS); p.hline(2, 9, ty + 8, lv(wood, 1));
  p.rect(w - 3, ty + 3, 2, h - ty - 3, lv(wood, 1.4));
}

/** Instrumento pendurado no gancho: violino → banjo → violão → guitarra sunburst → baixo → guitarra azul-petróleo. */
function instrument(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const cx = Math.floor(w / 2);
  p.rect(cx - 2, 0, 5, 2, ep >= 4 ? DGREY : pal.woodDark); p.rect(cx - 1, 2, 3, 1, CHROME); // gancho de parede
  const neck = C('#5a3a20');
  if (ep === 0) { // violino
    p.rect(cx - 1, 3, 2, 3, neck); p.ellipse(cx, 3, 1.4, 1.2, neck); p.rect(cx - 0, 4, 1, 9, BLACK);
    const body = C('#a8501e');
    p.ellipse(cx, 16, 4.5, 4, body); p.ellipse(cx, 23, 5.5, 4.5, body); p.rect(cx - 3, 18, 6, 3, body);
    p.put(cx - 2, 20, BLACK); p.put(cx + 2, 20, BLACK); p.vline(cx, 13, 25, C('#e8e0c8'));
    p.line(cx + 6, 6, cx + 3, h - 1, C('#8a6a4a')); // arco ao lado
    return;
  }
  if (ep === 1) { // banjo
    p.rect(cx - 1, 3, 3, 13, neck); for (let y = 5; y < 15; y += 3) p.hline(cx - 1, cx + 1, y, CHROME);
    p.disc(cx + 0.5, 22, 6, CHROME); p.disc(cx + 0.5, 22, 5, C('#f0e8d0')); p.ring(cx + 0.5, 22, 5.5, lv(CHROME, 1.6));
    p.vline(cx, 14, 26, DGREY); p.rect(cx - 1, 24, 3, 1, pal.woodDark);
    return;
  }
  const body = [0, 0, C('#d8a050'), C('#c8502a'), C('#2a2a30'), C('#2a8a9a')][ep];
  p.rect(cx - 1, 3, 3, 3, neck); p.rect(cx - 1, 6, 3, ep === 4 ? 13 : 10, neck);
  for (let y = 8; y < (ep === 4 ? 19 : 16); y += 3) p.hline(cx - 1, cx + 1, y, C('#c8c0a8'));
  const by = ep === 4 ? 19 : 16;
  if (ep === 2) { p.ellipse(cx, by + 3, 4.5, 3.5, body); p.ellipse(cx, by + 9, 6, 4.5, body); p.disc(cx + 0.5, by + 5, 1.6, BLACK); p.rect(cx - 2, by + 10, 5, 1, neck); }
  else {
    p.ellipse(cx - 1, by + 4, 4, 4, body); p.ellipse(cx, by + 8, 5.5, 4, body); p.poly([[cx + 2, by], [cx + 6, by - 2], [cx + 4, by + 3]], body);
    if (ep === 3) p.ellipse(cx, by + 6, 2.6, 2.6, C('#f0b040'));
    p.rect(cx - 2, by + 3, 5, 1, W); p.rect(cx - 2, by + 7, 5, 1, CHROME); p.disc(cx + 3, by + 10, 0.8, CHROME);
  }
  p.vline(cx, 6, by + 8, withAlpha(C('#e8e8e8'), 180));
  if (lit) p.line(cx - 4, by + 1, cx - 2, by - 1, lv(body, 5));
}

/** Garagem com a porta fechada: portões de cocheira de madeira → portões com vidraça → basculante → de enrolar → seccional branca → seccional escura com faixa de luz. */
function garage(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  const wall = [C('#a8503a'), C('#c8b898'), C('#e0d8c8'), C('#b89a78'), C('#d8d4cc'), C('#4a4c56')][ep];
  // fachada
  blk(p, 0, 4, w, h - 4, wall);
  if (ep === 0) for (let y = 6; y < h; y += 3) for (let x = (y % 2) * 3; x < w; x += 6) p.put(x, y, lv(wall, 2));
  p.poly([[-1, 5], [w / 2, -1], [w, 5]], ep === 5 ? C('#2a2a30') : ep === 2 || ep === 4 ? C('#8a8a92') : C('#6a3a2a')); // telhado
  p.hline(0, w - 1, 5, lv(wall, 1));
  // luminária acima da porta
  const lx = Math.floor(w / 2);
  p.rect(lx - 1, 7, 3, 2, DGREY); p.put(lx, 9, lit ? W : C('#c8b878'));
  if (lit) d.fx.ellipse(lx + 0.5, 11, 8, 4, withAlpha(GLOW, 70));
  const dx = 6, dy = 11, dw = w - 12, dh = h - dy - 2;
  p.rect(dx - 1, dy - 1, dw + 2, dh + 1, lv(wall, 0.8)); // batente
  const door = [C('#6a3a20'), C('#3f5a3a'), C('#d8d0c0'), C('#8a5a30'), C('#f0f0ec'), C('#26262c')][ep];
  p.rect(dx, dy, dw, dh, door);
  if (ep <= 1) { // duas folhas
    p.vline(dx + Math.floor(dw / 2), dy, dy + dh - 1, lv(door, 1));
    for (let y = dy + 2; y < dy + dh; y += 4) { p.hline(dx, dx + dw - 1, y, lv(door, 2.4)); }
    if (ep === 0) { p.line(dx + 1, dy + 1, dx + Math.floor(dw / 2) - 2, dy + dh - 2, lv(door, 1.4)); p.line(dx + Math.floor(dw / 2) + 2, dy + dh - 2, dx + dw - 2, dy + 1, lv(door, 1.4)); }
    else { for (let i = 0; i < 4; i++) p.rect(dx + 3 + i * 10, dy + 2, 6, 4, lit ? GLOW : pal.glass); }
    p.rect(dx + Math.floor(dw / 2) - 3, dy + Math.floor(dh / 2), 2, 2, BLACK); p.rect(dx + Math.floor(dw / 2) + 2, dy + Math.floor(dh / 2), 2, 2, BLACK);
  } else if (ep === 2) { for (let x = dx + 2; x < dx + dw; x += 3) p.vline(x, dy + 1, dy + dh - 2, lv(door, 2.2)); p.rect(dx + Math.floor(dw / 2) - 2, dy + dh - 4, 4, 1, CHROME); }
  else if (ep === 3) { for (let y = dy + 1; y < dy + dh; y += 2) p.hline(dx, dx + dw - 1, y, lv(door, 2.2)); p.rect(dx + Math.floor(dw / 2) - 2, dy + dh - 3, 4, 1, BLACK); }
  else { // seccional
    const n = 4, sh = Math.floor(dh / n);
    for (let i = 1; i < n; i++) p.hline(dx, dx + dw - 1, dy + i * sh, lv(door, 2));
    for (let i = 0; i < 4; i++) p.rect(dx + 3 + i * 10, dy + 2, 6, 3, ep === 5 ? (lit ? GLOW : C('#3a4a5a')) : lit ? GLOW : pal.glass);
    if (ep === 5) p.hline(dx, dx + dw - 1, dy - 2, lit ? SCR : C('#3a6a8a'));
  }
  // rampa/calçada
  p.rect(dx - 2, h - 2, dw + 4, 2, lv(C('#9a948a'), 3)); p.hline(dx - 2, dx + dw + 1, h - 2, lv(C('#9a948a'), 4));
  // pneu visível sob a porta: tem carro lá dentro
  p.rect(dx + 8, dy + dh - 1, 5, 1, BLACK); p.rect(dx + dw - 13, dy + dh - 1, 5, 1, BLACK);
}

/** Quarto das crianças: caminha com colcha alegre, desenho na parede e o brinquedo da época (cavalinho, ursinho, trenzinho, robô, videogame, tablet). */
function kidsroom(d: Dc): void {
  const { p, pal, ep, lit, w, h } = d;
  // desenho preso na parede
  p.rect(3, 1, 10, 8, W); p.put(7, 0, RED);
  p.disc(6, 4, 1.6, C('#f0c040')); p.poly([[8, 8], [11, 4], [12, 8]], C('#48b85c')); p.line(4, 7, 6, 6, C('#3a6ac8'));
  // caminha
  const fr = ep >= 4 ? (ep === 5 ? C('#e8e6e0') : C('#3a6ac8')) : ep === 3 ? C('#e8a030') : pal.wood;
  const blanket = [C('#c8a0b8'), C('#a8c8e0'), C('#f0a0b8'), C('#48b85c'), C('#e04848'), C('#8ad0c0')][ep];
  const my = h - 8;
  blk(p, 0, my - 8, 4, h - my + 8, fr); blk(p, 24, my - 3, 3, h - my + 3, fr);
  blk(p, 2, my, 23, 3, lv(fr, 2.4)); p.rect(3, my + 3, 2, h - my - 3, fr); p.rect(21, my + 3, 2, h - my - 3, fr);
  blk(p, 3, my - 3, 21, 3, W); blk(p, 9, my - 4, 15, 4, blanket); for (let x = 11; x < 23; x += 3) p.put(x, my - 2, lv(blanket, 4.6));
  blk(p, 4, my - 5, 5, 3, C('#f8f4ec'));
  // baú de brinquedos
  const box = ep >= 4 ? C('#f0c040') : C('#c8502a');
  blk(p, 28, h - 6, 8, 6, box); p.hline(28, 35, h - 4, lv(box, 1.6));
  // brinquedo da época
  const tx = 36;
  if (ep === 0) { // cavalinho de balanço
    p.poly([[tx - 1, h - 1], [w - 1, h - 1], [w - 2, h - 2], [tx, h - 2]], pal.woodDark);
    p.rect(tx + 1, h - 6, 5, 3, C('#e8e0c8')); p.rect(tx + 5, h - 9, 2, 4, C('#e8e0c8')); p.rect(tx + 6, h - 10, 2, 2, C('#e8e0c8')); p.vline(tx + 1, h - 3, h - 2, pal.woodDark); p.vline(tx + 5, h - 3, h - 2, pal.woodDark); p.put(tx + 5, h - 10, RED);
  } else if (ep === 1) { p.disc(tx + 3.5, h - 3, 3, C('#a86a3a')); p.disc(tx + 3.5, h - 8, 2.4, C('#a86a3a')); p.put(tx + 1, h - 10, C('#a86a3a')); p.put(tx + 6, h - 10, C('#a86a3a')); p.put(tx + 3, h - 8, BLACK); }
  else if (ep === 2) { blk(p, tx, h - 5, 7, 4, RED); p.rect(tx + 4, h - 8, 3, 3, RED); p.disc(tx + 1.5, h - 1, 1, BLACK); p.disc(tx + 5.5, h - 1, 1, BLACK); p.put(tx + 5, h - 9, DGREY); }
  else if (ep === 3) { blk(p, tx + 1, h - 7, 6, 6, CHROME); blk(p, tx + 2, h - 11, 4, 4, CHROME); p.put(tx + 3, h - 10, LED); p.put(tx + 4, h - 10, LED); p.vline(tx + 4, h - 13, h - 12, DGREY); p.rect(tx + 2, h - 1, 1, 1, DGREY); p.rect(tx + 5, h - 1, 1, 1, DGREY); }
  else if (ep === 4) { blk(p, tx, h - 4, 8, 4, C('#5a5a62')); p.rect(tx + 1, h - 3, 2, 1, lit ? LED : DGREY); blk(p, tx + 1, h - 12, 7, 6, BLACK); screen(p, tx + 2, h - 11, 5, 4, lit, C('#48b85c')); }
  else { p.poly([[tx, h - 1], [tx + 7, h - 1], [tx + 6, h - 4], [tx + 1, h - 4]], C('#c8ccd4')); blk(p, tx + 1, h - 12, 7, 8, C('#2a2a30')); screen(p, tx + 2, h - 11, 5, 6, lit, C('#e85a8a')); }
}

const DRAW5: Record<Obj5, (d: Dc) => void> = {
  door, worldmap, mail, calendar, monthdesk, ledger, safe, filing, rolodex, phone, paper, radiotv, goals, diary, learnbook, photo,
  whiteboard, meeting, model, cork, planning, scoutdesk, demos, trophies, keys, mirror, bed, writedesk, instrument, garage, kidsroom,
};

// ---------------------------------------------------------------- estados

/** Brilho de "aceso": anel dourado de 1 px por fora do contorno e um véu mais fraco por fora dele. */
const HALO = C('#ffd060');
/** Selo vermelho "!" no canto de cima à direita (mesmo vermelho do mock da barra de viagem). */
export function bang5(p: Px, x: number, y: number): void {
  p.rect(x, y, 7, 9, INK);
  p.rect(x + 1, y + 1, 5, 7, C('#e04848'));
  p.hline(x + 1, x + 5, y + 1, C('#ff7a6a'));
  p.vline(x + 3, y + 2, y + 5, W);
  p.put(x + 3, y + 7, W);
}

const cache5 = new Map<string, Px>();

/**
 * O objeto pronto (com margem PAD5 em volta): desenha numa camada, aplica o contorno INK e o estado.
 * `lit` acende o que tem luz (tela, abajur, LED) e põe o anel; `new` põe o selo "!".
 */
export function obj5Px(id: Obj5, year: number, st: St5 = 'idle'): Px {
  const ep = ep5Of(year);
  const key = `${id}|${ep}|${st}`;
  const hit = cache5.get(key);
  if (hit) return hit;
  const def = obj5Def(id);
  const { w, h } = obj5Size(id);
  const layer = new Px(def.w, def.h), fx = new Px(def.w, def.h);
  DRAW5[id]({ p: layer, fx, pal: paletteOf(EP5_YEAR[EP5[ep]]), ep, year, lit: st === 'lit', w: def.w, h: def.h });
  const out = new Px(w, h);
  out.blit(layer, PAD5, PAD5);
  out.outline(INK);
  if (st === 'lit') { out.outline(HALO); out.outline(withAlpha(HALO, 90)); }
  out.blit(fx, PAD5, PAD5);
  if (st === 'new') bang5(out, w - 8, 0);
  if (cache5.size > 800) cache5.clear();
  cache5.set(key, out);
  return out;
}

/** Canvas ampliado em escala inteira. */
export function obj5Canvas(id: Obj5, year: number, st: St5 = 'idle', scale = 3): HTMLCanvasElement {
  const p = obj5Px(id, year, st);
  return upscale(p.canvas(), p.w * scale, p.h * scale);
}

// ---------------------------------------------------------------- ícones de viagem (16×16, padrão de icons.ts)

export const TRAVEL5 = ['sede', 'casa', 'cidade', 'mundo'] as const;
export type Travel5 = (typeof TRAVEL5)[number];
export const TRAVEL5_LABEL: Record<Travel5, { pt: string; en: string }> = {
  sede: { pt: 'Sede', en: 'HQ' }, casa: { pt: 'Casa', en: 'Home' }, cidade: { pt: 'Cidade', en: 'City' }, mundo: { pt: 'Mundo', en: 'World' },
};

const K = {
  ink: C('#1a1214'), gold: C('#f0c040'), lgold: C('#fff2b0'), win: C('#ffe08a'), winOff: C('#c8a050'), brick: C('#b0503a'), lbrick: C('#c86a50'),
  roof: C('#c84a38'), lroof: C('#e06048'), cream: C('#f0e2c0'), dcream: C('#d8c8a0'), glass: C('#7ac0f0'), door: C('#8a5030'),
  grass: C('#3c8a3c'), lgrass: C('#5cb04c'), b1: C('#5a6a8a'), b2: C('#4a5a7a'), b3: C('#6a7aa0'), sea: C('#3a7ad0'), lsea: C('#6aa0e8'), land: C('#48b85c'), dland: C('#2c7a3c'),
  chim: C('#9a6034'), road: C('#3c3c4c'),
};

/** BUGS33 pedido 8: o botão Artistas do menu de baixo (não é lugar de viagem, mas usa o mesmo desenho 16×16). */
export type Dock5 = Travel5 | 'artistas';

function travelDraw(p: Px, id: Dock5, lit: boolean): void {
  const win = lit ? K.win : K.winOff;
  if (id === 'artistas') { // artista de topete com violão (aceso: camisa viva e a cravelha brilha)
    const skin = C('#f0c090'), hair = C('#3a2418'), shirt = lit ? C('#e05a8a') : C('#b04870'), pants = C('#2a3a6a');
    p.rect(6, 1, 4, 2, hair); p.put(10, 1, hair); // topete
    p.rect(6, 3, 4, 3, skin); p.put(7, 4, K.ink); p.put(9, 4, K.ink);
    p.rect(5, 6, 6, 5, shirt); p.vline(4, 7, 9, skin); // corpo e braço
    p.rect(6, 11, 2, 4, pants); p.rect(9, 11, 2, 4, pants);
    p.hline(5, 7, 15, K.ink); p.hline(9, 11, 15, K.ink);
    // violão atravessado
    p.disc(10, 10, 2, C('#c8803a')); p.disc(12, 9, 1.5, C('#c8803a')); p.put(10, 10, K.ink);
    p.line(12, 8, 15, 4, C('#6a3a1a')); p.put(15, 3, lit ? K.lgold : K.gold);
    return;
  }
  if (id === 'sede') { // prédio do selo com letreiro
    p.rect(3, 5, 10, 10, lit ? K.lbrick : K.brick); p.hline(3, 12, 5, K.lbrick); p.vline(12, 6, 14, C('#8a3a2a'));
    p.rect(2, 1, 12, 3, K.gold); p.hline(2, 13, 1, K.lgold); p.rect(7, 2, 2, 1, K.ink);
    for (const [x, y] of [[4, 7], [10, 7], [4, 10], [10, 10]] as const) { p.rect(x, y, 2, 2, win); if (lit) p.put(x, y, K.lgold); }
    p.rect(7, 11, 2, 4, K.door); p.put(7, 11, C('#a86a40'));
    p.hline(1, 14, 15, lit ? K.lgrass : K.grass);
    return;
  }
  if (id === 'casa') {
    p.rect(11, 2, 2, 4, K.chim);
    p.poly([[0.5, 8.5], [8, 1.5], [15.5, 8.5]], lit ? K.lroof : K.roof); p.line(3, 7, 8, 2, K.lroof);
    p.rect(2, 8, 12, 7, K.cream); p.hline(2, 13, 8, K.dcream);
    p.rect(3, 10, 3, 3, lit ? K.win : K.glass); p.rect(10, 10, 3, 3, lit ? K.win : K.glass); p.put(4, 11, K.ink); p.put(11, 11, K.ink);
    p.rect(7, 10, 2, 5, K.door);
    p.hline(1, 14, 15, lit ? K.lgrass : K.grass);
    return;
  }
  if (id === 'cidade') {
    const b = (x: number, y: number, w: number, c: Col) => { p.rect(x, y, w, 15 - y, c); p.hline(x, x + w - 1, y, lv(c, 4)); for (let yy = y + 2; yy < 14; yy += 2) for (let xx = x + 1; xx < x + w - 1; xx += 2) p.put(xx, yy, win); };
    b(0, 6, 5, K.b1); b(10, 4, 6, K.b2); b(4, 2, 6, K.b3); p.put(7, 0, K.ink); p.put(7, 1, lit ? C('#ff4a3a') : K.b3);
    p.hline(0, 15, 15, K.road);
    return;
  }
  // mundo: globo
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dd = Math.hypot(x - 7.5, y - 7.5);
    if (dd > 7.2) continue;
    const land = (x > 2 && x < 7 && y > 3 && y < 9) || (x > 8 && x < 12 && y > 5 && y < 13) || (x > 4 && x < 7 && y > 10 && y < 13) || (x > 9 && x < 13 && y > 2 && y < 5);
    let c = land ? (dd > 5.8 ? K.dland : K.land) : dd > 5.8 ? C('#2a5aa8') : K.sea;
    if (!land && x + y < 9) c = K.lsea;
    if (lit && !land && x + y < 7) c = C('#a8d0f8');
    p.put(x, y, c);
  }
  if (lit) { p.put(4, 3, K.lgold); p.put(10, 9, C('#ff4a3a')); }
}

const travelCache = new Map<string, Px>();
/** Ícone de viagem 16×16 com contorno; `lit` = o lugar atual (aceso); `new` = selo "!" no canto. */
export function travel5Px(id: Dock5, st: St5 = 'idle'): Px {
  const key = `${id}|${st}`;
  const hit = travelCache.get(key);
  if (hit) return hit;
  const p = new Px(16, 16);
  travelDraw(p, id, st === 'lit');
  p.outline(K.ink);
  if (st === 'new') { // selo pequeno 5×7 no canto de cima à direita
    p.rect(11, 0, 5, 7, K.ink); p.rect(12, 1, 3, 5, C('#e04848')); p.vline(13, 1, 3, W); p.put(13, 5, W);
  }
  travelCache.set(key, p);
  return p;
}
export function travel5Canvas(id: Dock5, st: St5 = 'idle', scale = 3): HTMLCanvasElement {
  return upscale(travel5Px(id, st).canvas(), 16 * scale);
}


