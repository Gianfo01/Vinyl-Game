// R33 · APARELHOS33 — ARTE DO CELULAR E DO COMPUTADOR, desenhada por código em Px (regras de pixel art do PLANO):
// contorno escuro quente (INK) pela silhueta (`outline`/`inked`), luz de cima à esquerda (`blk`: borda de cima e da
// esquerda um tom acima, de baixo e da direita abaixo), sombra arroxeada, tons pela rampa (`lv`), luz (tela acesa, cone
// do holograma) numa camada própria sem contorno. Cada aparelho muda de forma e material com a versão; nada flutua (o
// holograma sai do projetor do pulso, com o cone de luz até ele). Tudo PURO e determinístico (mesma entrada, mesmos
// pixels); nada vai para o save.
//
//   phonePx33(ver, lit)      — o celular inteiro + a área da tela (onde a casca põe o conteúdo)
//   pcPx33(ver, lit)         — o monitor com teclado + a área da tela
//   icon33(id, look, bang)   — ícone 16×16 de um app (lajota + desenho), no estilo da versão
//   dock33(ver, st)          — ícone 16×16 do botão CELULAR (menu de baixo)
//   deskPc33(ver, st)        — o computador pequeno em cima da mesa do escritório (objeto clicável da sede)
//   catalog33(year, st)      — o catálogo de vendas pelo correio na mesa (1889+)
//   gamePx33(game, look, w, h) — o minijogo na tela do aparelho

import { C, INK, Px, lv, mix, withAlpha, upscale, type Col } from '../pixel/px';
import { drawText } from '../pixel/font';
import type { AnyGame33 } from '../../sim/r33/jogos33';
import { mazeWall33 } from '../../sim/r33/jogos33';

export interface Rect33 { x: number; y: number; w: number; h: number }
export interface Dev33Art { p: Px; scr: Rect33; look: Look33 }
/** Como a tela pinta o conteúdo: LCD de segmentos, tela de toque, fósforo verde, janelas, holograma. */
export type Look33 = 'lcd1' | 'lcd' | 'gloss' | 'flat' | 'holo' | 'crt' | 'win' | 'portal' | 'pane' | 'glass';

const W = C('#f8f4ec'), BLACK = C('#1e1c22'), GREY = C('#8a8c94'), DGREY = C('#4a4c56'), CHROME = C('#b8bcc8'), BEIGE = C('#d8ccae');
const LCDG = C('#a8c48a'), LCDD = C('#2c3a24'), HOLO = C('#5ae0ff'), GLOW = C('#ffe08a'), RED = C('#e04848');

/** Bloco com luz de cima à esquerda e pé em sombra (a mesma conta do exp5px/prim27). */
function blk(p: Px, x: number, y: number, w: number, h: number, c: Col): void {
  if (w <= 0 || h <= 0) return;
  p.rect(x, y, w, h, c);
  p.hline(x, x + w - 1, y, lv(c, 4));
  if (h > 3 && w > 3) p.vline(x, y + 1, y + h - 2, lv(c, 3.5));
  p.hline(x, x + w - 1, y + h - 1, lv(c, 1));
  if (h > 2) p.vline(x + w - 1, y + 1, y + h - 2, lv(c, 2));
}
/** Corpo de cantos arredondados (raio r), mesma luz do blk. */
function rnd(p: Px, x: number, y: number, w: number, h: number, r: number, c: Col): void {
  const inside = (xx: number, yy: number) => {
    const cx = xx < x + r ? x + r : xx > x + w - 1 - r ? x + w - 1 - r : xx;
    const cy = yy < y + r ? y + r : yy > y + h - 1 - r ? y + h - 1 - r : yy;
    return (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r + 0.5;
  };
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (!inside(xx, yy)) continue;
    const top = !inside(xx, yy - 1), left = !inside(xx - 1, yy), bot = !inside(xx, yy + 1), right = !inside(xx + 1, yy);
    p.put(xx, yy, top ? lv(c, 4.4) : left ? lv(c, 3.6) : bot ? lv(c, 1) : right ? lv(c, 2) : c);
  }
}
/** Vidro de tela: base, reflexo diagonal claro no canto de cima à esquerda (luz da cena). */
function glass(p: Px, r: Rect33, base: Col, lit: boolean): void {
  p.rect(r.x, r.y, r.w, r.h, base);
  if (!lit) for (let i = 0; i < Math.min(r.w, r.h) / 3; i++) p.line(r.x + 2 + i, r.y + 1, r.x + 1, r.y + 2 + i, mix(base, W, 0.06));
  p.hline(r.x, r.x + r.w - 1, r.y, lv(base, 1));
}
const done = (p: Px): Px => { p.outline(INK); return p; };

// ---------------------------------------------------------------- celulares (5 versões)

const PH_SIZE: Record<number, [number, number]> = { 1983: [46, 132], 1997: [62, 152], 2007: [66, 124], 2012: [72, 144], 2032: [80, 150] };
export const phoneSize33 = (ver: number): [number, number] => PH_SIZE[ver] ?? PH_SIZE[2012];

const cache = new Map<string, Dev33Art>();
/** O celular da versão (tijolão 1983, flip 1997, 1º smartphone 2007, smartphone 2012, holograma 2032) e a área da tela. */
export function phonePx33(ver: number, lit = true): Dev33Art {
  const key = `ph|${ver}|${lit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [w, h] = phoneSize33(ver);
  const body = new Px(w, h), light = new Px(w, h);
  let scr: Rect33, look: Look33;
  if (ver === 1983) { // tijolão: antena de borracha, corpo grafite, visor verde estreito, teclado grande
    const c = C('#4a4a54');
    blk(body, 30, 0, 5, 26, C('#2a2a30')); body.vline(31, 1, 24, C('#3a3a42'));
    rnd(body, 2, 22, w - 4, h - 23, 3, c);
    blk(body, 6, 28, w - 12, 6, lv(c, 2.4)); for (let x = 9; x < w - 9; x += 3) body.put(x, 30, BLACK); // alto-falante
    scr = { x: 7, y: 38, w: w - 14, h: 20 };
    blk(body, scr.x - 2, scr.y - 2, scr.w + 4, scr.h + 4, C('#2a2a30'));
    const K83 = ['', '', '', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) { const x = 8 + k * 11, y = 66 + r * 11; blk(body, x, y, 9, 8, k === 2 && r === 0 ? C('#c84a38') : k === 0 && r === 0 ? C('#48a050') : C('#d8d4c8')); const ch = K83[r * 3 + k]; if (ch) drawText(body, ch, x + 3, y + 2, C('#3a3a42')); }
    for (let x = 18; x < 28; x += 2) body.put(x, h - 5, BLACK); // microfone
    look = 'lcd1';
  } else if (ver === 1997) { // flip: tampa com visor grande, dobradiça, teclado
    const c = C('#7a8aa8');
    rnd(body, 2, 0, w - 4, 76, 5, c);
    blk(body, 22, 4, w - 44, 4, lv(c, 2)); for (let x = 24; x < w - 24; x += 2) body.put(x, 5, BLACK);
    scr = { x: 9, y: 13, w: w - 18, h: 50 };
    blk(body, scr.x - 3, scr.y - 3, scr.w + 6, scr.h + 6, C('#3a4258'));
    blk(body, 0, 74, w, 6, lv(c, 1.6)); // dobradiça
    rnd(body, 2, 78, w - 4, h - 79, 5, c);
    blk(body, w / 2 - 12, 84, 24, 10, C('#4a5470')); blk(body, w / 2 - 5, 86, 10, 6, CHROME); // tecla de navegação
    const K97 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { const x = 9 + k * 16, y = 99 + r * 12; blk(body, x, y, 13, 9, C('#e8e2d4')); drawText(body, K97[r * 3 + k], x + 5, y + 2, C('#4a5470')); }
    look = 'lcd';
  } else if (ver === 2007) { // 1º smartphone: vidro preto, aro cromado, botão redondo
    rnd(body, 1, 1, w - 2, h - 2, 8, CHROME);
    rnd(body, 3, 3, w - 6, h - 6, 7, C('#16161c'));
    blk(body, w / 2 - 6, 7, 12, 2, DGREY);
    scr = { x: 6, y: 14, w: w - 12, h: h - 34 };
    body.disc(w / 2, h - 10, 5, lv(C('#16161c'), 2.4)); body.ring(w / 2, h - 10, 5, DGREY); body.rect(w / 2 - 2, h - 12, 4, 4, lv(C('#16161c'), 3.2));
    look = 'gloss';
  } else if (ver === 2012) { // smartphone de borda fina
    rnd(body, 1, 1, w - 2, h - 2, 7, C('#2a2c34'));
    rnd(body, 2, 2, w - 4, h - 4, 6, C('#1a1a20'));
    blk(body, w / 2 - 7, 5, 14, 2, DGREY); body.put(w / 2 + 10, 6, C('#3a3c48'));
    scr = { x: 4, y: 11, w: w - 8, h: h - 26 };
    blk(body, w / 2 - 8, h - 10, 16, 4, C('#26262e'));
    look = 'flat';
  } else { // 2032: pulseira com projetor; a tela é luz que sai do projetor (cone até ela, sem nada flutuando)
    const band = C('#3a3c4a');
    rnd(body, 4, h - 22, w - 8, 20, 6, band);
    for (let x = 10; x < w - 10; x += 4) body.vline(x, h - 19, h - 6, lv(band, 2));
    blk(body, w / 2 - 9, h - 26, 18, 10, C('#c8ccd8')); body.disc(w / 2, h - 21, 3, C('#1a3a5a')); body.disc(w / 2, h - 21, 1.5, HOLO);
    scr = { x: 6, y: 2, w: w - 12, h: h - 44 };
    // cone de luz do projetor até a tela (camada de luz: sem contorno)
    for (let y = scr.y + scr.h; y < h - 23; y++) { const t = (y - scr.y - scr.h) / Math.max(1, h - 23 - scr.y - scr.h); const half = (1 - t) * (scr.w / 2) + t * 3; light.hline(Math.round(w / 2 - half), Math.round(w / 2 + half), y, withAlpha(HOLO, Math.round(40 + 60 * t))); }
    look = 'holo';
  }
  done(body);
  if (look === 'holo') {
    for (let y = scr.y; y < scr.y + scr.h; y++) for (let x = scr.x; x < scr.x + scr.w; x++) {
      const edge = x === scr.x || y === scr.y || x === scr.x + scr.w - 1 || y === scr.y + scr.h - 1;
      light.put(x, y, edge ? withAlpha(HOLO, 230) : withAlpha(mix(C('#0a2a3a'), HOLO, (y % 3 === 0 ? 0.22 : 0.12)), 170));
    }
  } else {
    const base = look === 'lcd1' || look === 'lcd' ? (lit ? LCDG : lv(LCDG, 1.6)) : lit ? C('#1a2a48') : C('#0c0e14');
    glass(body, scr, base, lit);
    if ((look === 'lcd' || look === 'lcd1') && lit) light.rect(scr.x, scr.y, scr.w, scr.h, withAlpha(C('#d8f0a0'), 40));
  }
  body.blit(light, 0, 0);
  const out = { p: body, scr, look };
  cache.set(key, out);
  return out;
}

// ---------------------------------------------------------------- computadores (5 versões)

const PC_SIZE: Record<number, [number, number]> = { 1982: [176, 142], 1995: [188, 150], 2003: [196, 152], 2012: [216, 150], 2032: [220, 150] };
export const pcSize33 = (ver: number): [number, number] => PC_SIZE[ver] ?? PC_SIZE[2012];
/** O computador da versão: tela verde e disquete (1982), janelas e modem (1995), banda larga (2003), tela plana (2012),
 *  vidro com holograma (2032). Monitor em cima da mesa, teclado na frente. */
export function pcPx33(ver: number, lit = true): Dev33Art {
  const key = `pc|${ver}|${lit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [w, h] = pcSize33(ver);
  const p = new Px(w, h), light = new Px(w, h);
  let scr: Rect33, look: Look33;
  const kb = (y: number, c: Col, kc: Col, x0 = 18, x1 = w - 18) => { blk(p, x0, y, x1 - x0, 12, c); for (let r = 0; r < 3; r++) for (let x = x0 + 3 + (r % 2) * 2; x < x1 - 4; x += 5) p.rect(x, y + 2 + r * 3, 3, 2, kc); };
  if (ver === 1982 || ver === 1995 || ver === 2003) {
    const c = ver === 1982 ? C('#d8cca8') : ver === 1995 ? C('#d4ccb4') : C('#b8bcc4');
    const mw = ver === 1982 ? 132 : ver === 1995 ? 144 : 152, mh = ver === 1982 ? 104 : 110;
    const mx = Math.floor((w - mw) / 2);
    blk(p, mx + 18, mh - 2, mw - 36, 10, lv(c, 2.2)); // pescoço/caixa do tubo
    rnd(p, mx, 0, mw, mh, 4, c);
    scr = { x: mx + 10, y: 8, w: mw - 20, h: mh - 24 };
    blk(p, scr.x - 3, scr.y - 3, scr.w + 6, scr.h + 6, lv(c, 1.4));
    p.rect(mx + mw - 18, mh - 12, 8, 3, lv(c, 1.8)); p.put(mx + mw - 12, mh - 11, lit ? C('#48d860') : DGREY); // luz de ligado
    if (ver === 1982) { blk(p, mx + 8, mh - 13, 30, 6, lv(c, 2)); p.hline(mx + 11, mx + 34, mh - 10, BLACK); } // entrada de disquete
    if (ver === 1995) { blk(p, w - 30, h - 34, 26, 8, C('#2a2a30')); for (let i = 0; i < 4; i++) p.put(w - 27 + i * 5, h - 31, lit && i % 2 ? GLOW : C('#48d860')); } // modem
    kb(h - 16, ver === 2003 ? C('#c8ccd4') : C('#e0d8c0'), ver === 2003 ? DGREY : C('#8a8270'));
    if (ver !== 1982) { blk(p, w - 14, h - 12, 8, 10, lv(c, 3)); p.vline(w - 10, h - 12, h - 8, DGREY); } // mouse
    look = ver === 1982 ? 'crt' : ver === 1995 ? 'win' : 'portal';
  } else if (ver === 2012) {
    const c = C('#1e1e24');
    blk(p, w / 2 - 6, 118, 12, 14, C('#3a3c44')); blk(p, w / 2 - 22, 130, 44, 4, C('#3a3c44'));
    rnd(p, 4, 0, w - 8, 120, 3, c);
    scr = { x: 8, y: 4, w: w - 16, h: 108 };
    p.put(w / 2, 116, lit ? C('#5ae0ff') : DGREY);
    kb(h - 13, C('#c8ccd4'), DGREY, 30, w - 30);
    look = 'pane';
  } else {
    // 2032: lâmina de vidro presa num pé de metal; a imagem fica dentro do vidro
    blk(p, w / 2 - 30, 124, 60, 8, CHROME); blk(p, w / 2 - 4, 112, 8, 14, CHROME);
    for (let y = 0; y < 116; y++) { p.put(6, y, withAlpha(C('#c8f0ff'), 230)); p.put(w - 7, y, withAlpha(C('#c8f0ff'), 230)); }
    p.hline(6, w - 7, 0, withAlpha(C('#c8f0ff'), 230)); p.hline(6, w - 7, 115, withAlpha(C('#c8f0ff'), 230));
    scr = { x: 8, y: 2, w: w - 16, h: 112 };
    blk(p, 40, h - 12, w - 80, 4, withAlpha(C('#a8d8f0'), 220));
    look = 'glass';
  }
  done(p);
  if (look === 'glass') {
    for (let y = scr.y; y < scr.y + scr.h; y++) for (let x = scr.x; x < scr.x + scr.w; x++) light.put(x, y, withAlpha(mix(C('#0a1a2a'), HOLO, y % 4 === 0 ? 0.16 : 0.08), 200));
  } else {
    const base = look === 'crt' ? (lit ? C('#0c1c0e') : C('#0a0e0a')) : look === 'win' ? C('#1a6a6a') : look === 'portal' ? C('#2a4a8a') : C('#141a28');
    glass(p, scr, lit ? base : lv(base, 0.6), lit);
    if (look === 'crt' && lit) for (let y = scr.y; y < scr.y + scr.h; y += 2) light.hline(scr.x, scr.x + scr.w - 1, y, withAlpha(C('#48d860'), 14));
  }
  p.blit(light, 0, 0);
  const out = { p, scr, look };
  cache.set(key, out);
  return out;
}

// ---------------------------------------------------------------- ícones dos apps (16×16)

const TILE: Record<string, string> = {
  ligar: '#3a8a4a', recados: '#3a6ac8', agenda: '#e8e2d4', toques: '#e0b048', jogo: '#7a4ab0', radio: '#8a5a3a', familia: '#4a9a5a',
  musica: '#e07a3a', videos: '#c83a32', noticias: '#e8e2d4', mapa: '#3a9aa0', camera: '#6a6c78', banco: '#e0b048', redes: '#8a4ac8',
  faclube: '#e0c048', streaming: '#3aa05a', bolsa: '#7a7c88', compras: '#e07a2a', leilao: '#8a5a2a', ingressos: '#e8e2d4', encontros: '#d84a6a',
  imoveis: '#4a6ac8', saude: '#e8e2d4', assistente: '#2aa0c0', planilha: '#3a8a4a', contratos: '#e8e2d4', relatorios: '#e8e2d4', editor: '#e0b048',
  forum: '#5a5c68', demos: '#3a6ac8', loja: '#e07a2a', painel: '#3aa05a', anuncios: '#e0b048', ia: '#7a4ab0',
};
/** Desenho do ícone sobre a lajota (cor do desenho `g`). */
function glyph(p: Px, id: string, g: Col, a: Col): void {
  const R = (x: number, y: number, w: number, h: number, c = g) => p.rect(x, y, w, h, c);
  switch (id) {
    case 'ligar': R(4, 9, 3, 3); R(9, 4, 3, 3); p.line(5, 9, 10, 4, g); p.line(6, 10, 11, 5, g); break;
    case 'recados': case 'email': R(3, 5, 10, 7); p.line(3, 5, 8, 9, a); p.line(12, 5, 8, 9, a); break;
    case 'agenda': R(3, 3, 10, 2, C('#c83a32')); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R(4 + i * 3, 7 + j * 2, 2, 1, DGREY); break;
    case 'toques': R(5, 4, 2, 7); R(7, 4, 4, 2); R(9, 6, 2, 5); p.disc(5, 11, 1.6, g); p.disc(9, 11, 1.6, g); break;
    case 'jogo': R(3, 6, 10, 5); R(4, 8, 3, 1, a); R(5, 7, 1, 3, a); p.put(10, 7, a); p.put(11, 9, a); break;
    case 'radio': R(3, 6, 10, 7); p.line(5, 6, 11, 2, g); p.disc(6, 9, 1.6, a); R(9, 8, 3, 1, a); R(9, 10, 3, 1, a); break;
    case 'familia': p.disc(5, 6, 1.6, g); p.disc(10, 6, 1.6, g); R(3, 8, 5, 5); R(8, 8, 5, 5); break;
    case 'musica': case 'streaming': R(6, 3, 2, 8); R(8, 3, 4, 2); p.disc(5, 11, 2, g); break;
    case 'videos': p.poly([[5, 4], [5, 12], [12, 8]], g); break;
    case 'noticias': R(3, 3, 10, 10, W); R(4, 4, 8, 2, DGREY); for (let y = 7; y < 12; y += 2) R(4, y, 8, 1, GREY); break;
    case 'mapa': p.disc(8, 6, 3, g); p.poly([[5, 7], [11, 7], [8, 13]], g); p.disc(8, 6, 1, a); break;
    case 'camera': R(3, 5, 10, 7); R(5, 4, 3, 1); p.disc(8, 8, 2.2, a); p.disc(8, 8, 1, g); break;
    case 'banco': case 'planilha': R(3, 4, 10, 8, W); for (let y = 6; y < 12; y += 2) R(4, y, 8, 1, id === 'banco' ? C('#8a6a2a') : C('#3a8a4a')); R(7, 4, 1, 8, GREY); break;
    case 'redes': p.disc(5, 8, 2, g); p.disc(11, 5, 2, g); p.disc(11, 11, 2, g); p.line(5, 8, 11, 5, g); p.line(5, 8, 11, 11, g); break;
    case 'faclube': p.poly([[8, 3], [10, 7], [13, 7], [11, 10], [12, 13], [8, 11], [4, 13], [5, 10], [3, 7], [6, 7]], g); break;
    case 'bolsa': case 'painel': p.line(3, 11, 6, 8, g); p.line(6, 8, 9, 10, g); p.line(9, 10, 13, 4, g); R(3, 12, 10, 1); break;
    case 'compras': case 'loja': R(4, 6, 8, 7); R(6, 3, 1, 3); R(9, 3, 1, 3); R(6, 3, 4, 1); break;
    case 'leilao': p.line(4, 12, 9, 7, g); p.line(5, 12, 10, 7, g); R(8, 3, 5, 3); R(3, 12, 6, 1); break;
    case 'ingressos': R(3, 5, 10, 6, C('#e0b048')); R(7, 5, 1, 6, W); p.put(3, 8, BLACK); p.put(12, 8, BLACK); break;
    case 'encontros': p.disc(6, 6, 2.4, g); p.disc(10, 6, 2.4, g); p.poly([[3.6, 7], [12.4, 7], [8, 12.5]], g); break;
    case 'imoveis': p.poly([[2.5, 8.5], [8, 3], [13.5, 8.5]], g); R(4, 8, 8, 5); R(7, 10, 2, 3, a); break;
    case 'saude': R(7, 3, 2, 10, C('#c83a32')); R(3, 7, 10, 2, C('#c83a32')); break;
    case 'assistente': case 'ia': p.disc(8, 8, 4, g); p.disc(8, 8, 2, a); R(7, 2, 2, 2); break;
    case 'contratos': case 'relatorios': R(4, 2, 8, 12, W); for (let y = 4; y < 11; y += 2) R(5, y, 6, 1, GREY); if (id === 'contratos') p.line(5, 12, 10, 11, C('#3a3ac8')); else R(5, 10, 6, 2, C('#c83a32')); break;
    case 'editor': for (let x = 3; x < 13; x++) { const hh = [2, 4, 6, 3, 7, 5, 2, 6, 4, 3][x - 3]; R(x, 8 - Math.floor(hh / 2), 1, hh, C('#2a6a9a')); } break;
    case 'forum': R(3, 4, 7, 5); R(6, 7, 7, 5, a); p.put(4, 9, g); break;
    case 'demos': p.disc(8, 8, 5, BLACK); p.disc(8, 8, 2, g); p.put(8, 8, BLACK); break;
    case 'anuncios': p.poly([[3, 6], [9, 3], [9, 13], [3, 10]], g); R(10, 6, 3, 4, a); break;
    default: R(4, 4, 8, 8); break;
  }
}
const icache = new Map<string, Px>();
/** Ícone do app: lajota arredondada com luz (2007 brilhante, 2012 chapada, 2032 só contorno de luz, PC de janelas). */
export function icon33(id: string, look: Look33, bang = 0): Px {
  const key = `${id}|${look}|${bang ? 1 : 0}`;
  const hit = icache.get(key);
  if (hit) return hit;
  const p = new Px(16, 16);
  const base = C(TILE[id] ?? '#7a7c88');
  if (look === 'holo' || look === 'glass') {
    for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) { const e = x === 1 || y === 1 || x === 14 || y === 14; if (e) p.put(x, y, withAlpha(HOLO, 230)); }
    const q = new Px(16, 16); glyph(q, id, HOLO, C('#0a2a3a')); p.blit(q, 0, 0);
  } else {
    rnd(p, 1, 1, 14, 14, look === 'win' || look === 'crt' ? 1 : 3, base);
    if (look === 'gloss') for (let x = 2; x < 14; x++) p.put(x, 2, mix(base, W, 0.55));
    const dark = TILE[id] && ['#e8e2d4', '#e0b048', '#e0c048'].includes(TILE[id]);
    const q = new Px(16, 16); glyph(q, id, dark ? DGREY : W, base); p.blit(q, 0, 0);
    p.outline(INK);
  }
  if (bang) { p.rect(11, 0, 5, 7, INK); p.rect(12, 1, 3, 5, RED); p.vline(13, 1, 3, W); p.put(13, 5, W); }
  icache.set(key, p);
  return p;
}

// ---------------------------------------------------------------- botão CELULAR (16×16)

/** Ícone do botão do menu de baixo: o aparelho da versão em pé (aceso = selecionado, "new" = selo "!"). */
export function dock33(ver: number, st: 'idle' | 'lit' | 'new'): Px {
  const p = new Px(16, 16);
  const lit = st === 'lit';
  if (ver === 1983) { blk(p, 9, 0, 2, 5, C('#2a2a30')); rnd(p, 5, 4, 7, 12, 1, C('#4a4a54')); p.rect(6, 6, 5, 2, lit ? LCDG : lv(LCDG, 1.4)); for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) p.put(6 + i * 3, 10 + j * 2, C('#d8d4c8')); }
  else if (ver === 1997) { rnd(p, 4, 0, 8, 8, 2, C('#7a8aa8')); p.rect(5, 2, 6, 4, lit ? LCDG : lv(LCDG, 1.4)); p.hline(4, 11, 8, C('#4a5470')); rnd(p, 4, 9, 8, 7, 2, C('#7a8aa8')); for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) p.put(5 + i * 2, 11 + j * 2, W); }
  else if (ver === 2032) { rnd(p, 3, 11, 10, 5, 2, C('#3a3c4a')); p.rect(7, 10, 2, 2, C('#c8ccd8')); for (let y = 1; y < 9; y++) for (let x = 3; x < 13; x++) p.put(x, y, withAlpha(HOLO, x === 3 || x === 12 || y === 1 || y === 8 ? 240 : lit ? 130 : 80)); p.line(8, 9, 8, 10, withAlpha(HOLO, 200)); }
  else { rnd(p, 4, 0, 8, 16, 2, ver === 2007 ? C('#16161c') : C('#2a2c34')); p.rect(5, 2, 6, 11, lit ? C('#6a4ac8') : C('#3a2a6a')); for (let y = 3; y < 12; y += 2) for (let x = 6; x < 10; x += 2) p.put(x, y, lit ? C('#c8b0ff') : C('#5a4a8a')); if (ver === 2007) p.put(8, 14, DGREY); }
  p.outline(INK);
  if (st === 'new') { p.rect(11, 0, 5, 7, INK); p.rect(12, 1, 3, 5, RED); p.vline(13, 1, 3, W); p.put(13, 5, W); }
  return p;
}
export const dock33Canvas = (ver: number, st: 'idle' | 'lit' | 'new', scale = 3): HTMLCanvasElement => upscale(dock33(ver, st).canvas(), 16 * scale);

// ---------------------------------------------------------------- objetos da mesa (sede)

export const PAD33 = 4;
const HALO = C('#ffd060');
/** O estado do objeto clicável (mesmo padrão do obj5Px): contorno, anel dourado aceso, selo "!" de novidade. */
function state(layer: Px, fx: Px, st: 'idle' | 'new' | 'lit'): Px {
  const out = new Px(layer.w + 2 * PAD33, layer.h + 2 * PAD33);
  out.blit(layer, PAD33, PAD33);
  out.outline(INK);
  if (st === 'lit') { out.outline(HALO); out.outline(withAlpha(HALO, 90)); }
  out.blit(fx, PAD33, PAD33);
  if (st === 'new') { const x = out.w - 8; out.rect(x, 0, 7, 9, INK); out.rect(x + 1, 1, 5, 7, RED); out.vline(x + 3, 2, 5, W); out.put(x + 3, 7, W); }
  return out;
}
export const DESKPC_SIZE33 = { w: 28, h: 30 };
/** O computador da mesa do escritório: mesinha de trabalho na altura da cintura (26) com o computador da versão em cima
 *  (bege de tela verde → bege de janelas → cinza → tela plana → lâmina de vidro), teclado e gabinete. */
export function deskPc33(ver: number, st: 'idle' | 'new' | 'lit' = 'idle'): Px {
  const { w, h } = DESKPC_SIZE33;
  const p = new Px(w, h), fx = new Px(w, h);
  const lit = st === 'lit';
  const wood = ver >= 2012 ? C('#d8d4cc') : ver >= 1995 ? C('#8a6a4a') : C('#7a4a2a');
  const top = h - 12; // tampo
  blk(p, 0, top, w, 3, wood); p.hline(0, w - 1, top, lv(wood, 4.6));
  blk(p, 1, top + 3, 3, h - top - 3, lv(wood, 1.8)); blk(p, w - 4, top + 3, 3, h - top - 3, lv(wood, 1.8));
  if (ver < 2012) { blk(p, w - 12, top + 3, 8, h - top - 4, lv(wood, 2.4)); p.put(w - 8, top + 6, C('#c0a060')); } // gaveta
  if (ver <= 2003) {
    const c = ver === 2003 ? C('#b8bcc4') : C('#d8cca8');
    blk(p, 6, top - 3, 14, 3, lv(c, 2)); // pé/caixa
    blk(p, 4, 0, 18, top - 3, c);
    const sc = ver === 1982 ? C('#0c1c0e') : ver === 1995 ? C('#1a6a6a') : C('#2a4a8a');
    p.rect(6, 2, 14, top - 8, lit ? lv(sc, 4) : sc);
    if (ver === 1982) for (let y = 3; y < top - 6; y += 2) p.hline(7, 7 + ((y * 3) % 8) + 2, y, C('#48d860'));
    else { p.rect(7, 3, 4, 3, BEIGE); p.rect(12, 6, 6, 4, W); }
    p.put(19, top - 5, lit ? C('#48d860') : DGREY);
    blk(p, 3, top - 2, 16, 2, ver === 2003 ? C('#c8ccd4') : C('#e0d8c0')); // teclado
    if (ver === 1982) blk(p, 22, top - 6, 5, 6, lv(c, 2.4)); // unidade de disquete
    else { blk(p, 21, top - 2, 3, 2, lv(c, 3)); }
  } else if (ver === 2012) {
    blk(p, 12, top - 4, 4, 4, C('#3a3c44')); blk(p, 9, top - 1, 10, 1, C('#3a3c44'));
    blk(p, 3, 0, 22, top - 4, C('#1e1e24')); p.rect(4, 1, 20, top - 6, lit ? C('#2a4a7a') : C('#141a28'));
    p.rect(5, 2, 7, 4, C('#3aa05a')); p.rect(13, 2, 9, 7, C('#e8e2d4'));
    blk(p, 4, top - 1, 6, 1, C('#c8ccd4'));
  } else {
    blk(p, 10, top - 2, 8, 2, CHROME);
    for (let y = 0; y < top - 2; y++) for (let x = 3; x < w - 3; x++) fx.put(x, y, withAlpha(mix(C('#0a1a2a'), HOLO, x === 3 || x === w - 4 || y === 0 ? 0.9 : 0.15), 200));
    blk(p, 4, top - 1, w - 8, 1, withAlpha(C('#a8d8f0'), 230));
  }
  return state(p, fx, st);
}
export const CATALOG_SIZE33 = { w: 16, h: 10 };
/** O catálogo de vendas pelo correio em cima da mesa: capa com gravura (até 1949) ou foto colorida, lombada grampeada. */
export function catalog33(year: number, st: 'idle' | 'new' | 'lit' = 'idle'): Px {
  const { w, h } = CATALOG_SIZE33;
  const p = new Px(w, h), fx = new Px(w, h);
  const cover = year < 1950 ? C('#c8b890') : year < 1975 ? C('#e0a040') : C('#d84a3a');
  blk(p, 0, 2, w, h - 2, cover);
  p.rect(1, h - 2, w - 2, 1, C('#efe6cc')); // páginas
  blk(p, 2, 3, w - 4, 2, year < 1950 ? C('#5a4a3a') : W);
  p.rect(3, 6, 4, 2, year < 1950 ? C('#8a7a5a') : C('#3a6ac8')); p.rect(9, 6, 4, 2, year < 1950 ? C('#8a7a5a') : C('#48b85c'));
  p.vline(0, 3, h - 2, lv(cover, 1)); p.put(0, 4, CHROME); p.put(0, 7, CHROME);
  if (st === 'lit') p.rect(2, 3, w - 4, 1, mix(W, GLOW, 0.5));
  return state(p, fx, st);
}

// ---------------------------------------------------------------- minijogos na tela

/** Paleta do jogo pelo aparelho: LCD (fundo verde, pixel escuro), fósforo (preto, verde), cor (tela de toque), holograma. */
function pal(look: Look33): { bg: Col; fg: Col; hi: Col; dim: Col } {
  if (look === 'lcd' || look === 'lcd1') return { bg: LCDG, fg: LCDD, hi: C('#1a2414'), dim: lv(LCDG, 2.2) };
  if (look === 'crt') return { bg: C('#0a140a'), fg: C('#48d860'), hi: C('#a8ffb0'), dim: C('#1a3a1e') };
  if (look === 'holo' || look === 'glass') return { bg: withAlpha(C('#0a2a3a'), 220), fg: HOLO, hi: C('#e0fbff'), dim: withAlpha(HOLO, 70) };
  return { bg: C('#141a28'), fg: C('#e0b048'), hi: W, dim: C('#2a3048') };
}
const BCOL = ['#c83a32', '#e0b048', '#3aa05a', '#3a6ac8', '#8a4ac8', '#e07a2a', '#3a9aa0'].map((x) => C(x));
/** O jogo desenhado em `w`×`h` pixels lógicos (a casca amplia em escala inteira). */
export function gamePx33(x: AnyGame33, look: Look33, w: number, h: number): Px {
  const p = new Px(w, h);
  const k = pal(look);
  p.rect(0, 0, w, h, k.bg);
  const hud = (t: string) => drawText(p, t, 2, 1, k.fg);
  if (x.k === 'snake' || x.k === 'holo') {
    const g = x.g, cs = Math.max(2, Math.floor(Math.min((w - 2) / g.w, (h - 9) / g.h)));
    const ox = Math.floor((w - cs * g.w) / 2), oy = 8;
    p.rect(ox - 1, oy - 1, cs * g.w + 2, 1, k.dim); p.rect(ox - 1, oy + cs * g.h, cs * g.w + 2, 1, k.dim);
    p.rect(ox - 1, oy - 1, 1, cs * g.h + 2, k.dim); p.rect(ox + cs * g.w, oy - 1, 1, cs * g.h + 2, k.dim);
    const fz = x.k === 'holo' && g.foodZ !== g.z;
    p.rect(ox + g.food[0] * cs + (fz ? 1 : 0), oy + g.food[1] * cs + (fz ? 1 : 0), cs - (fz ? 2 : 0) || 1, cs - (fz ? 2 : 0) || 1, fz ? k.dim : k.hi);
    g.body.forEach(([bx, by], i) => p.rect(ox + bx * cs, oy + by * cs, cs - (i ? 0 : 0), cs, i === 0 ? k.hi : k.fg));
    hud(w >= 64 ? `${x.k === 'holo' ? `HOLO ${g.z + 1}` : 'COBRINHA'} ${String(g.score).padStart(4, '0')}` : String(g.score).padStart(4, '0'));
  } else if (x.k === 'tennis') {
    const g = x.g, sx = (w - 2) / g.w, sy = (h - 9) / g.h, oy = 8;
    for (let y = oy; y < h; y += 3) p.put(Math.floor(w / 2), y, k.dim);
    p.rect(1, oy + Math.round(g.me * sy), 2, Math.round(g.pad * sy), k.fg);
    p.rect(w - 3, oy + Math.round(g.cpu * sy), 2, Math.round(g.pad * sy), k.fg);
    p.rect(1 + Math.round(g.bx * sx), oy + Math.round(g.by * sy), 2, 2, k.hi);
    hud(w >= 64 ? `TENIS ${g.score}  ${'o'.repeat(3 - g.miss)}` : `${g.score} ${'o'.repeat(3 - g.miss)}`);
  } else if (x.k === 'maze') {
    const g = x.g, cs = Math.max(2, Math.floor(Math.min((w - 2) / g.w, (h - 9) / g.h)));
    const ox = Math.floor((w - cs * g.w) / 2), oy = 8;
    for (let yy = 0; yy < g.h; yy++) for (let xx = 0; xx < g.w; xx++) if (mazeWall33(g, xx, yy)) p.rect(ox + xx * cs, oy + yy * cs, cs, cs, k.dim);
    p.rect(ox + g.exit[0] * cs, oy + g.exit[1] * cs, cs, cs, k.fg);
    p.rect(ox + g.at[0] * cs, oy + g.at[1] * cs, cs, cs, k.hi);
    hud(w >= 72 ? `LABIRINTO ${g.level}/3 ${g.score}` : `${g.level}/3 ${g.score}`);
  } else if (x.k === 'blocks') {
    const g = x.g, cs = Math.max(2, Math.floor(Math.min((w - 2) / g.w, (h - 9) / g.h)));
    const ox = Math.floor((w - cs * g.w) / 2), oy = 8;
    p.rect(ox - 1, oy, cs * g.w + 2, cs * g.h + 1, k.dim); p.rect(ox, oy, cs * g.w, cs * g.h, k.bg);
    const cell = (cx: number, cy: number, c: Col) => { p.rect(ox + cx * cs, oy + cy * cs, cs, cs, c); if (cs > 3) p.hline(ox + cx * cs, ox + cx * cs + cs - 1, oy + cy * cs, lv(c, 4.4)); };
    for (let yy = 0; yy < g.h; yy++) for (let xx = 0; xx < g.w; xx++) { const v = g.cells[yy * g.w + xx]; if (v) cell(xx, yy, look === 'holo' ? HOLO : BCOL[(v - 1) % BCOL.length]); }
    for (const [a, b] of g.piece) if (b + g.py >= 0) cell(a + g.px, b + g.py, look === 'holo' ? k.hi : BCOL[g.kind % BCOL.length]);
    hud(w >= 56 ? `BLOCOS ${g.score}` : String(g.score));
  } else {
    const g = x.g, cs = Math.floor(Math.min((w - 8) / 3, (h - 14) / 3)), ox = Math.floor((w - cs * 3) / 2), oy = 10;
    for (let i = 0; i < 9; i++) {
      const cx = ox + (i % 3) * cs, cy = oy + Math.floor(i / 3) * cs;
      blk(p, cx + 1, cy + 1, cs - 2, cs - 2, i === g.lit ? C('#e0b048') : C('#2a3048'));
      drawText(p, String(i + 1), cx + 3, cy + 3, i === g.lit ? INK : k.dim);
    }
    hud(w >= 64 ? `TOQUE ${g.score}  ${Math.ceil(g.left / 10)}s` : `${g.score} ${Math.ceil(g.left / 10)}s`);
  }
  return p;
}
