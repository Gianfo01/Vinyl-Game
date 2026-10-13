// Pessoas em pixel art combináveis (GDD §44): corpo, rosto, pele, cabelo, roupa e acessórios
// em camadas separadas. Sprites isométricos em 4 direções (caminhada de 4 quadros, parado,
// sentado, tocando o instrumento do papel) e retrato de busto para fichas.

import { Rng, hashString } from '../../core/rng';
import type { Appearance, GameState, Person } from '../../sim/types';
import { PALETTES, eraOf, tone, type EraId, type Palette } from './palette';
import { C, Px, dith, mix, shade, upscale, withAlpha, type Col, type Sprite } from './px';
import { ageInfo, ageLook } from './age17';

export type Dir = 'SE' | 'SW' | 'NE' | 'NW';
export type Pose = 'stand' | 'walk' | 'sit' | 'play' | 'sitplay';
export type Role = Person['role'];

export const SKINS = ['#f6d3b3', '#e0aa7e', '#a8714a', '#6e4528'];
export const HAIR_COLORS = ['#1e1814', '#3d2616', '#6e4426', '#8e3a1e', '#dcb862', '#c0602a', '#cfc9bf', '#4a6fd0', '#f1e9cf', '#d0302c', '#ee7cc0', '#8fe04a', '#7fb8e8'];
export const OUTFIT_COLORS = ['#2c4a7e', '#a33434', '#2f7a4c', '#d0a43c', '#6a4590', '#e4dccb', '#2a2a30', '#d8692a', '#d8b040', '#e070a8', '#b4b8c4', '#5e3c26', '#6ab0e0'];
export const HAIR_STYLES = 23;

const DYED: Record<EraId, string> = { '1920': '#e8dcb0', '1950': '#e8dcb0', '1960': '#e8dcb0', '1980': '#ff5fb0', '1990': '#5fbf4a', '2000': '#3f7fe0', '2010': '#9a6ae0', '2020': '#b58cff', '2030': '#3fe8d8' };

/** Aparência derivada do id (determinística) — usada quando a pessoa não tem `look`. */
export function randomLook(seed: string): Appearance {
  const r = Rng.fromSeed(`look:${seed}`);
  const hairColor = r.weighted([0, 1, 2, 3, 4, 5, 6, 7], (i) => [26, 24, 18, 7, 11, 5, 5, 4][i]) ?? 0;
  const hair = r.chance(0.07) ? 0 : r.int(1, 15);
  return {
    body: r.weighted([0, 1, 2], (i) => [36, 46, 18][i]) ?? 1,
    face: r.int(0, 2),
    skin: r.int(0, 3),
    hair,
    hairColor,
    outfit: r.int(0, 3),
    outfitColor: r.int(0, 7),
    glasses: r.chance(0.18),
    hat: r.chance(0.12),
    beard: r.chance(0.2),
  };
}

/** Rodada 15: resolvedor opcional (UI) — visual real pela fase ou procedural coerente com sexo/pele. */
let LOOK_FN: ((p: { id: string }) => Appearance | undefined) | null = null;
export function setLookResolver(fn: typeof LOOK_FN): void { LOOK_FN = fn; }

export function lookOf(p: { id: string; look?: Appearance; born?: number }): Appearance {
  const a = p.look ?? LOOK_FN?.(p) ?? randomLook(p.id);
  const g = ageInfo(p); // rodada 17: o visual envelhece com a pessoa
  return g ? ageLook(a, g.age, p.id, g.sx) : a;
}

export function lookKey(a: Appearance): string {
  return `${a.body}${a.face}${a.skin}.${a.hair}.${a.hairColor}.${a.outfit}${a.outfitColor}${a.glasses ? 1 : 0}${a.hat ? 1 : 0}${a.beard ? 1 : 0}.${a.hatT ?? ''}${a.hatC ?? ''}.${a.glT ?? ''}${a.bdT ?? ''}${a.paint ?? ''}${a.helm ?? ''}.${a.roots ?? ''}${a.sx ?? ''}${a.ag || a.gy || a.bl ? `.${a.ag ?? 0}${a.gy ?? 0}${a.bl ?? 0}` : ''}`;
}

// ---------- cores ----------

interface Colors {
  skin: Col; skinD: Col; skinL: Col;
  hair: Col; hairD: Col; hairL: Col;
  cloth: Col; clothD: Col; clothL: Col;
  shirt: Col;
  pants: Col; pantsD: Col;
  shoe: Col;
  accent: Col;
  glow: Col;
  ink: Col;
}

function colorsFor(a: Appearance, pal: Palette): Colors {
  const t = (c: Col) => tone(c, pal);
  const skin = C(SKINS[a.skin % 4]);
  const hairHex = a.hairColor === 7 ? DYED[pal.era] : HAIR_COLORS[a.hairColor % HAIR_COLORS.length];
  let hair = t(C(hairHex));
  if (a.gy) hair = mix(hair, t(C('#d6d2ca')), Math.min(0.92, a.gy / 10)); // rodada 17: grisalho
  const cloth = t(C(OUTFIT_COLORS[a.outfitColor % OUTFIT_COLORS.length]));
  const e = pal.era;
  const formalPants = a.outfit === 1 && (e === '1920' || e === '1950');
  let pants = C('#3a5a8c');
  if (e === '1920') pants = C('#4a4038');
  else if (e === '1950') pants = C('#2f4a78');
  else if (e === '1960') pants = C('#7a5232');
  else if (e === '1980') pants = C('#2a2a34');
  else if (e === '1990') pants = C('#4a6a9a');
  else if (e === '2000') pants = C('#3a5684');
  else if (e === '2010') pants = C('#26262c');
  else if (e === '2020') pants = C('#8a7a5a');
  else pants = C('#1c2a34');
  if (formalPants) pants = shade(cloth, -0.25);
  pants = t(pants);
  const shoes: Record<EraId, string> = { '1920': '#3a2414', '1950': '#1e1a1a', '1960': '#6a4222', '1980': '#e8e8ec', '1990': '#1a1a1e', '2000': '#d8d8de', '2010': '#f0f0f0', '2020': '#e8e2d8', '2030': '#2a3a44' };
  return {
    skin, skinD: shade(skin, -0.2), skinL: shade(skin, 0.15),
    hair, hairD: shade(hair, -0.3), hairL: shade(hair, 0.25),
    cloth, clothD: shade(cloth, -0.28), clothL: shade(cloth, 0.2),
    shirt: t(C('#f2eee4')),
    pants, pantsD: shade(pants, -0.25),
    shoe: t(C(shoes[e])),
    accent: t(pal.accent),
    glow: pal.glow,
    ink: pal.outline,
  };
}

// ---------- cabeça (compartilhada entre sprite e retrato) ----------

interface HeadCtx {
  p: Px;
  x0: number; // canto do crânio (unidade 0)
  y0: number;
  s: number; // escala (1 sprite, 2 retrato)
  col: Colors;
  look: Appearance;
  era: EraId;
  view: 'front' | 'back';
  blink?: boolean;
}

function R(h: HeadCtx, x: number, y: number, w: number, hh: number, c: Col): void {
  h.p.rect(h.x0 + x * h.s, h.y0 + y * h.s, w * h.s, hh * h.s, c);
}

function drawSkull(h: HeadCtx): void {
  const { col } = h;
  R(h, 1, 0, 6, 1, col.skin);
  R(h, 0, 1, 8, 6, col.skin);
  R(h, 1, 7, 6, 1, col.skin);
  // sombra à direita e queixo
  R(h, 7, 1, 1, 6, col.skinD);
  R(h, 1, 7, 6, 1, col.skinD);
  if (h.view === 'front') {
    R(h, 0, 3, 1, 2, col.skinD); // orelha
    if (h.s > 1) h.p.rect(h.x0 + 1, h.y0 + 7, 1, 2, shade(col.skinD, -0.15));
  } else {
    R(h, 0, 3, 1, 2, col.skinD);
    R(h, 7, 3, 1, 2, shade(col.skinD, -0.1));
  }
}

function drawFace(h: HeadCtx): void {
  const { col, look, s, p } = h;
  if (h.view !== 'front') return;
  const eye = mix(col.ink, C('#000000'), 0.3);
  const X = (u: number) => h.x0 + u * s;
  const Y = (v: number) => h.y0 + v * s;
  if (s === 1) {
    if (h.blink) {
      p.put(X(3), Y(4), col.skinD);
      p.put(X(6), Y(4), col.skinD);
    } else {
      p.put(X(3), Y(4), eye);
      p.put(X(6), Y(4), eye);
    }
    if (look.face === 1) { p.put(X(3), Y(3), col.hairD); p.put(X(6), Y(3), col.hairD); p.put(X(5), Y(5), col.skinD); }
    if ((look.ag ?? 0) >= 3) { p.put(X(2), Y(5), col.skinD); p.put(X(7), Y(5), col.skinD); }
    if (look.face === 2) { p.set(X(2), Y(5), withAlpha(C('#e86a6a'), 110)); p.set(X(7), Y(5), withAlpha(C('#e86a6a'), 90)); }
    if (!look.beard || look.bdT) {
      if (look.face === 0) p.hline(X(4), X(5), Y(6), mix(col.skinD, C('#8a3a3a'), 0.4));
      else if (look.face === 1) p.put(X(5), Y(6), mix(col.skinD, C('#8a3a3a'), 0.5));
      else { p.put(X(4), Y(6), mix(col.skinD, C('#8a3a3a'), 0.5)); p.put(X(5), Y(6), mix(col.skinD, C('#8a3a3a'), 0.5)); p.put(X(3), Y(5) + 0, col.skin); }
    }
    return;
  }
  // retrato (escala 2): olhos com esclera, sobrancelha, nariz, boca
  for (const ex of [3, 6]) {
    const x = X(ex) - 1;
    const y = Y(4);
    if (h.blink) p.hline(x, x + 2, y + 1, col.skinD);
    else {
      p.put(x, y, C('#ffffff'));
      p.put(x + 1, y, eye);
      p.put(x + 2, y, C('#f2f2f2'));
      p.put(x, y + 1, C('#e8e8e8'));
      p.put(x + 1, y + 1, eye);
      p.put(x + 2, y + 1, shade(C('#e8e8e8'), -0.1));
      p.hline(x, x + 2, y - 1, col.skinD);
    }
    const browY = Y(3) - (look.face === 1 ? 1 : 0);
    p.hline(x - (ex === 3 ? 1 : 0), x + 2, browY, look.face === 1 ? col.hairD : col.hair);
  }
  // rodada 17: rugas pela idade (pés de galinha, olheiras, bigode chinês, testa)
  const ag = look.ag ?? 0;
  if (ag >= 1) { p.put(X(3) - 2, Y(4), col.skinD); p.put(X(6) + 2, Y(4), col.skinD); }
  if (ag >= 2) { p.hline(X(3) - 1, X(3) + 1, Y(4) + 2, shade(col.skin, -0.12)); p.hline(X(6) - 1, X(6) + 1, Y(4) + 2, shade(col.skin, -0.12)); p.put(X(4) - 1, Y(6), col.skinD); p.put(X(6) + 1, Y(6), col.skinD); }
  if (ag >= 3) { p.hline(X(2), X(6), Y(2), shade(col.skin, -0.1)); p.put(X(4) - 1, Y(6) + 1, col.skinD); p.put(X(6) + 1, Y(6) + 1, col.skinD); }
  // nariz
  p.put(X(5), Y(5), col.skinD);
  p.put(X(5) + 1, Y(5) + 1, col.skinD);
  p.put(X(5), Y(5) + 1, col.skinD);
  if (look.face === 2) { p.set(X(2), Y(5) + 1, withAlpha(C('#e86a6a'), 120)); p.set(X(2) + 1, Y(5) + 1, withAlpha(C('#e86a6a'), 90)); p.set(X(7), Y(5) + 1, withAlpha(C('#e86a6a'), 100)); }
  if (!look.beard || look.bdT) {
    const lip = mix(col.skinD, C('#a03a3a'), 0.45);
    if (look.face === 0) p.hline(X(4), X(5) + 1, Y(6) + 1, lip);
    else if (look.face === 1) { p.hline(X(4) + 1, X(5) + 1, Y(6) + 1, lip); }
    else { p.hline(X(4), X(5) + 1, Y(6) + 1, lip); p.put(X(4) - 1, Y(6), lip); p.put(X(5) + 2, Y(6), lip); }
  }
}

function drawBeard(h: HeadCtx): void {
  if (!h.look.beard || h.view !== 'front') return;
  const { col } = h;
  const bt = h.look.bdT ?? 0;
  if (bt === 1 || bt === 2) {
    R(h, 2, 5, 4, 1, col.hair); // bigode
    if (h.s > 1) { h.p.hline(h.x0 + 4, h.x0 + 11, h.y0 + 11, col.hair); h.p.put(h.x0 + 3, h.y0 + 12, col.hairD); h.p.put(h.x0 + 12, h.y0 + 12, col.hairD); }
    if (bt === 2) { R(h, 3, 7, 2, 1, col.hair); R(h, 3, 8, 2, 1, col.hairD); }
    return;
  }
  if (bt === 3) {
    for (let y = h.y0 + 5 * h.s; y < h.y0 + 8 * h.s; y++) for (let x = h.x0; x < h.x0 + 8 * h.s; x++) if (dith(x, y, 0.5)) h.p.set(x, y, withAlpha(col.hairD, 110));
    return;
  }
  R(h, 0, 5, 1, 2, col.hair);
  R(h, 7, 5, 1, 2, col.hairD);
  R(h, 1, 6, 6, 2, col.hair);
  R(h, 2, 8, 4, 1, col.hairD);
  R(h, 3, 5, 3, 1, col.hair); // bigode
  if (h.s === 1) h.p.put(h.x0 + 4, h.y0 + 6, mix(col.hairD, C('#8a3a3a'), 0.4));
  else h.p.hline(h.x0 + 8, h.x0 + 11, h.y0 + 13, mix(col.hairD, C('#8a3a3a'), 0.4));
}

function drawGlasses(h: HeadCtx): void {
  if (!h.look.glasses || h.view !== 'front') return;
  const e = h.era;
  const gt = h.look.glT ?? 0;
  let frame = e === '1980' ? C('#e84aa0') : e === '2030' ? C('#3fe8d8') : e === '1950' || e === '1960' ? C('#3a2418') : C('#1e1e24');
  let lens = e === '2030' ? withAlpha(C('#5ffff0'), 150) : withAlpha(C('#bfe0ff'), 120);
  if (gt === 1) { frame = C('#b89a4a'); lens = withAlpha(C('#9a7ad0'), 110); }
  else if (gt === 2) { frame = C('#101014'); lens = C('#18181e'); }
  else if (gt === 3) { frame = C('#ff4fb0'); lens = withAlpha(C('#ffd23f'), 170); }
  const { p, s } = h;
  const X = (u: number) => h.x0 + u * s;
  const Y = (v: number) => h.y0 + v * s;
  if (gt && s > 1) {
    for (const ex of [3, 6]) {
      const x = X(ex) - 2;
      const y = Y(4) - 1;
      if (gt === 1) { p.hline(x + 1, x + 3, y, frame); p.hline(x + 1, x + 3, y + 3, frame); p.vline(x, y + 1, y + 2, frame); p.vline(x + 4, y + 1, y + 2, frame); p.rect(x + 1, y + 1, 3, 2, lens); }
      else if (gt === 2) { p.rect(x, y, 5, 3, frame); p.rect(x + 1, y + 1, 3, 2, lens); p.put(x + 1, y + 1, C('#5a5a6a')); }
      else { p.rect(x - 1, y - 1, 7, 5, frame); p.rect(x, y, 5, 3, lens); p.put(x - 2, y - 2, C('#ffffff')); p.put(x + 6, y - 2, C('#ffffff')); }
    }
    p.hline(X(4) + 1, X(5), Y(4), frame);
    p.hline(X(0), X(1), Y(4), frame);
    return;
  }
  if (s === 1) {
    p.set(X(2), Y(4), frame);
    p.set(X(3), Y(4), lens);
    p.set(X(4), Y(4), frame);
    p.set(X(5), Y(4), frame);
    p.set(X(6), Y(4), lens);
    p.set(X(7), Y(4), frame);
    return;
  }
  for (const ex of [3, 6]) {
    const x = X(ex) - 2;
    const y = Y(4) - 1;
    p.hline(x, x + 4, y, frame);
    p.hline(x, x + 4, y + 3, frame);
    p.vline(x, y, y + 3, frame);
    p.vline(x + 4, y, y + 3, frame);
    p.rect(x + 1, y + 1, 3, 2, lens);
  }
  p.hline(X(4) + 1, X(5), Y(4), frame);
  p.hline(X(0), X(1), Y(4), frame);
}

type HairFn = (h: HeadCtx, c: Colors) => void;

/** Cabelos: cada função desenha em unidades da cabeça (0..7 × 0..7; negativos = volume). */
const HAIR: HairFn[] = [
  // 0 careca
  (h, c) => { if (h.view === 'front') R(h, 2, 0, 2, 1, c.skinL); else R(h, 2, 1, 2, 1, c.skinL); },
  // 1 curto
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 2, c.hair); R(h, 0, 2, 1, 2, c.hair); R(h, 7, 2, 1, 1, c.hairD);
    if (h.view === 'back') R(h, 0, 0, 8, 6, c.hair);
  },
  // 2 risca lateral com franja
  (h, c) => {
    R(h, 1, -1, 3, 1, c.hair); R(h, 5, -1, 2, 1, c.hair); R(h, 0, 0, 8, 2, c.hair);
    if (h.view === 'front') { R(h, 0, 2, 4, 1, c.hair); R(h, 0, 3, 1, 1, c.hair); R(h, 4, -1, 1, 1, c.hairL); }
    else R(h, 0, 0, 8, 6, c.hair);
  },
  // 3 raspado
  (h, c) => {
    const st = mix(c.hair, c.skin, 0.35);
    R(h, 1, 0, 6, 1, st); R(h, 0, 1, 8, 1, st);
    if (h.view === 'back') R(h, 0, 1, 8, 5, st);
  },
  // 4 topete
  (h, c) => {
    R(h, 2, -2, 6, 1, c.hair); R(h, 6, -3, 3, 1, c.hairL); R(h, 1, -1, 7, 1, c.hair); R(h, 0, 0, 8, 2, c.hair);
    R(h, 0, 2, 1, 3, c.hair);
    R(h, 3, -2, 3, 1, c.hairL);
    if (h.view === 'back') R(h, 0, 0, 8, 6, c.hair);
  },
  // 5 cuia / mop-top
  (h, c) => {
    R(h, 1, -2, 6, 1, c.hair); R(h, 0, -1, 8, 1, c.hair); R(h, -1, 0, 10, 3, c.hair);
    R(h, -1, 3, 1, 3, c.hair); R(h, 8, 3, 1, 3, c.hairD);
    if (h.view === 'front') R(h, 1, 3, 6, 1, c.hair);
    else R(h, -1, 0, 10, 7, c.hair);
    R(h, 2, -2, 3, 1, c.hairL);
  },
  // 6 black power
  (h, c) => {
    h.p.ellipse(h.x0 + 4 * h.s, h.y0 + 1.5 * h.s, 6.2 * h.s, 5.2 * h.s, (x, y) => (dith(x, y, 0.25) ? c.hairD : c.hair));
    if (h.view === 'front') { drawSkullFaceArea(h); }
  },
  // 7 longo liso
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 2, c.hair);
    R(h, -1, 1, 2, 10, c.hair); R(h, 7, 1, 2, 10, c.hairD);
    if (h.view === 'front') R(h, 4, 1, 3, 1, c.hair);
    else R(h, -1, 0, 10, 11, c.hair);
    R(h, 2, -1, 2, 1, c.hairL);
  },
  // 8 longo ondulado
  (h, c) => {
    R(h, 0, -2, 8, 1, c.hair); R(h, -1, -1, 10, 3, c.hair);
    for (let v = 2; v < 12; v++) { const o = v % 3 === 0 ? -1 : 0; R(h, -2 + o + 1, v, 2, 1, c.hair); R(h, 8 - o - 1, v, 2, 1, c.hairD); }
    if (h.view === 'back') R(h, -1, 0, 10, 12, c.hair);
    R(h, 1, -2, 3, 1, c.hairL);
  },
  // 9 rabo de cavalo
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 2, c.hair); R(h, 0, 2, 1, 1, c.hair);
    if (h.view === 'front') { R(h, 8, 2, 1, 6, c.hairD); }
    else { R(h, 0, 0, 8, 5, c.hair); R(h, 3, 5, 2, 7, c.hair); R(h, 3, 4, 2, 1, c.accent); }
  },
  // 10 coque
  (h, c) => {
    R(h, 2, -3, 4, 2, c.hair); R(h, 3, -3, 2, 1, c.hairL); R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 2, c.hair); R(h, 0, 2, 1, 2, c.hair);
    if (h.view === 'back') R(h, 0, 0, 8, 6, c.hair);
  },
  // 11 moicano
  (h, c) => {
    const sh = mix(c.hair, c.skin, 0.55);
    R(h, 0, 0, 8, 2, sh);
    R(h, 3, -4, 2, 6, c.hair); R(h, 3, -4, 1, 2, c.hairL);
    if (h.view === 'back') { R(h, 0, 0, 8, 5, sh); R(h, 3, -4, 2, 10, c.hair); }
  },
  // 12 cacheado curto
  (h, c) => {
    for (let u = -1; u <= 8; u++) R(h, u, -2 + (u % 2 === 0 ? 0 : 1), 1, 1, u % 3 ? c.hair : c.hairL);
    R(h, -1, -1, 10, 3, c.hair); R(h, -1, 2, 1, 2, c.hair); R(h, 8, 2, 1, 2, c.hairD);
    if (h.view === 'back') R(h, -1, -1, 10, 7, c.hair);
    for (let u = 0; u < 8; u += 2) R(h, u, 0, 1, 1, c.hairD);
  },
  // 13 chanel
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, -1, 0, 10, 3, c.hair); R(h, -1, 3, 2, 4, c.hair); R(h, 7, 3, 2, 4, c.hairD);
    if (h.view === 'back') R(h, -1, 0, 10, 7, c.hair);
    R(h, 2, -1, 2, 1, c.hairL);
  },
  // 14 espetado
  (h, c) => {
    for (const u of [0, 2, 4, 6]) { R(h, u, -3, 1, 1, c.hairL); R(h, u, -2, 2, 1, c.hair); }
    R(h, 0, -1, 8, 3, c.hair); R(h, 0, 2, 1, 1, c.hair);
    if (h.view === 'back') R(h, 0, -1, 8, 7, c.hair);
  },
  // 15 dreads / tranças
  (h, c) => {
    R(h, 0, -1, 8, 3, c.hair);
    for (let u = -1; u <= 8; u += 2) { if (h.view === 'front' && u > 0 && u < 7) continue; R(h, u, 2, 1, 10, u > 4 ? c.hairD : c.hair); R(h, u, 12, 1, 1, c.accent); }
    if (h.view === 'back') for (let u = -1; u <= 8; u++) R(h, u, 0, 1, 12 - (u % 2), u % 2 ? c.hairD : c.hair);
    R(h, 2, -1, 3, 1, c.hairL);
  },
  // 16 mullet
  (h, c) => {
    R(h, 1, -2, 6, 1, c.hair); R(h, 0, -1, 8, 3, c.hair); R(h, 0, 2, 1, 2, c.hair); R(h, 7, 2, 1, 1, c.hairD);
    R(h, -1, 4, 2, 6, c.hair); R(h, 7, 4, 2, 6, c.hairD);
    if (h.view === 'back') R(h, -1, -1, 10, 11, c.hair);
    R(h, 2, -2, 3, 1, c.hairL);
  },
  // 17 bufante / colmeia
  (h, c) => {
    h.p.ellipse(h.x0 + 4 * h.s, h.y0 - 1 * h.s, 5.6 * h.s, 4.2 * h.s, (x, y) => (dith(x, y, 0.2) ? c.hairD : c.hair));
    R(h, -2, 1, 2, 7, c.hair); R(h, 8, 1, 2, 7, c.hairD);
    if (h.view === 'front') { R(h, 1, 2, 6, 5, c.skin); R(h, 1, 1, 3, 1, c.hair); R(h, 7, 1, 1, 6, c.skinD); R(h, 0, 3, 1, 2, c.skinD); }
    else R(h, -2, -3, 12, 11, c.hair);
    R(h, 2, -4, 3, 1, c.hairL);
  },
  // 18 gomalina (para trás)
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 1, c.hair); R(h, 0, 1, 1, 2, c.hair); R(h, 7, 1, 1, 2, c.hairD);
    R(h, 2, -1, 4, 1, c.hairL);
    if (h.view === 'back') R(h, 0, 0, 8, 6, c.hair);
  },
  // 19 longo com franja reta
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 3, c.hair);
    R(h, -1, 1, 2, 10, c.hair); R(h, 7, 1, 2, 10, c.hairD);
    if (h.view === 'back') R(h, -1, 0, 10, 11, c.hair);
    R(h, 2, -1, 3, 1, c.hairL);
  },
  // 20 cachos longos volumosos
  (h, c) => {
    h.p.ellipse(h.x0 + 4 * h.s, h.y0 + 3 * h.s, 6.4 * h.s, 7.4 * h.s, (x, y) => (dith(x, y, 0.3) ? c.hairD : (x + y) % 5 === 0 ? c.hairL : c.hair));
    if (h.view === 'front') { R(h, 1, 2, 6, 5, c.skin); R(h, 1, 7, 6, 1, c.skinD); R(h, 1, 1, 6, 1, c.hair); R(h, 0, 2, 1, 1, c.hair); }
  },
  // 21 trancinhas rentes
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 2, c.hair); R(h, 0, 2, 1, 2, c.hair); R(h, 7, 2, 1, 1, c.hairD);
    for (let u = 1; u < 8; u += 2) R(h, u, -1, 1, 3, c.hairD);
    if (h.view === 'back') { R(h, 0, 0, 8, 6, c.hair); for (let u = 1; u < 8; u += 2) R(h, u, 0, 1, 6, c.hairD); }
  },
  // 22 pixie assimétrico
  (h, c) => {
    R(h, 1, -1, 7, 1, c.hair); R(h, 0, 0, 9, 2, c.hair); R(h, 4, 2, 4, 1, c.hair); R(h, 7, 3, 2, 2, c.hairD);
    R(h, 0, 2, 1, 1, mix(c.hair, c.skin, 0.5));
    if (h.view === 'back') R(h, 0, 0, 8, 5, c.hair);
    R(h, 5, -1, 2, 1, c.hairL);
  },
];

/** Reabre o rosto depois de um cabelo volumoso (black power). */
function drawSkullFaceArea(h: HeadCtx): void {
  const { col } = h;
  R(h, 1, 2, 6, 5, col.skin);
  R(h, 1, 7, 6, 1, col.skinD);
}

const HAT_DEF = ['', '#1c1c20', '#8a6038', '', '', '#c03030', '', '#2a2a30', ''];

/** Rodada 15: chapéus com forma própria (cartola, caubói, boina, gorro, faixa, boné, fedora, bandana). */
function drawHatType(h: HeadCtx, ty: number): void {
  const c = h.col;
  const pal = PALETTES[h.era];
  const hc = h.look.hatC !== undefined ? tone(C(OUTFIT_COLORS[h.look.hatC % OUTFIT_COLORS.length]), pal) : HAT_DEF[ty] ? tone(C(HAT_DEF[ty]), pal) : c.cloth;
  const hd = shade(hc, -0.3);
  const hl = shade(hc, 0.25);
  if (ty === 1) { R(h, -2, 0, 12, 1, hc); R(h, 0, -6, 8, 6, hc); R(h, 0, -1, 8, 1, mix(hc, C('#c8b070'), 0.5)); R(h, 1, -6, 2, 5, hl); R(h, 7, -6, 1, 6, hd); }
  else if (ty === 2) { R(h, -3, 0, 14, 1, hc); R(h, -3, -1, 1, 1, hc); R(h, 10, -1, 1, 1, hc); R(h, 1, -3, 6, 3, hc); R(h, 3, -3, 2, 1, hd); R(h, 1, -1, 6, 1, hd); R(h, 1, -3, 1, 2, hl); }
  else if (ty === 3) { R(h, -1, -1, 9, 2, hc); R(h, 0, -2, 7, 1, hc); R(h, 3, -3, 1, 1, hd); R(h, 0, -2, 3, 1, hl); }
  else if (ty === 4) { R(h, 0, -3, 8, 1, hc); R(h, -1, -2, 10, 3, hc); R(h, -1, 0, 10, 1, hd); R(h, 1, -3, 2, 1, hl); }
  else if (ty === 5) { R(h, 0, 1, 8, 1, hc); if (h.view === 'back') R(h, 3, 1, 2, 3, hd); else R(h, 8, 1, 1, 3, hd); }
  else if (ty === 6) { R(h, 0, -2, 8, 3, hc); R(h, 1, -2, 3, 1, hl); if (h.view === 'front') R(h, -1, 0, 7, 1, hd); else R(h, 6, 0, 4, 1, hd); }
  else if (ty === 7) { R(h, -2, 0, 12, 1, hc); R(h, 1, -3, 6, 3, hc); R(h, 1, -1, 6, 1, hd); R(h, 3, -3, 2, 1, hd); R(h, 1, -3, 1, 2, hl); }
  else { R(h, 0, -1, 8, 3, hc); R(h, -1, 1, 10, 1, hc); R(h, 2, -1, 3, 1, hl); if (h.view === 'front') { R(h, 8, 1, 2, 2, hd); R(h, 9, 3, 1, 2, hd); } else R(h, 3, 2, 2, 3, hd); }
}

/** Rodada 15: pintura facial por baixo dos olhos (base branca e marcas). */
const WHITE_PAINT = [1, 2, 3, 4, 7];
const BACK_HAIR = [6, 17, 20];
function drawPaintUnder(h: HeadCtx): void {
  const pt = h.look.paint ?? 0;
  if (!pt || h.view !== 'front') return;
  const ink = C('#101014');
  if (pt === 1) { // estrela no olho direito (do artista)
    R(h, 3, 2, 1, 4, ink); R(h, 2, 4, 3, 1, ink); R(h, 2, 3, 1, 1, ink); R(h, 4, 3, 1, 1, ink); R(h, 2, 5, 1, 1, ink); R(h, 4, 5, 1, 1, ink);
    R(h, 4, 6, 2, 1, mix(ink, C('#c02020'), 0.6));
  } else if (pt === 2) { // demônio: asas pretas até a testa
    for (const ex of [3, 6]) { R(h, ex - 1, 3, 3, 2, ink); R(h, ex === 3 ? 1 : 6, 1, 1, 2, ink); R(h, ex === 3 ? 2 : 7, 2, 1, 1, ink); }
    R(h, 4, 6, 2, 1, ink);
  } else if (pt === 3) { // gato: focinho e bigodes
    for (const ex of [3, 6]) R(h, ex - 1, 3, 3, 1, C('#2f8a4a'));
    R(h, 4, 5, 2, 1, ink); R(h, 1, 5, 2, 1, ink); R(h, 6, 5, 2, 1, ink); R(h, 1, 6, 1, 1, ink); R(h, 7, 6, 1, 1, ink);
  } else if (pt === 4) { // espacial: estrelas prateadas nos dois olhos
    for (const ex of [3, 6]) { R(h, ex - 1, 3, 3, 3, C('#c8ccd8')); R(h, ex, 2, 1, 1, C('#c8ccd8')); R(h, ex, 6, 1, 1, C('#c8ccd8')); }
    R(h, 4, 6, 2, 1, mix(ink, C('#a03030'), 0.5));
  } else if (pt === 7) { // máscara branca com olhos negros
    for (const ex of [3, 6]) R(h, ex - 1, 3, 3, 3, ink);
    R(h, 4, 6, 2, 1, ink);
  }
}

/** Marcas por cima (raio vermelho/azul, delineador). */
function drawPaintOver(h: HeadCtx): void {
  const pt = h.look.paint ?? 0;
  if (!pt || h.view !== 'front') return;
  const { p, s } = h;
  if (pt === 5) {
    const red = C('#e02a2a');
    const blue = C('#3a7ae0');
    const pts: [number, number][] = [[5, 0], [3, 3], [5, 3], [3, 7]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = pts[i]; const [c2, d] = pts[i + 1];
      p.line(h.x0 + a * s, h.y0 + b * s, h.x0 + c2 * s, h.y0 + d * s, red);
      if (s > 1) p.line(h.x0 + a * s + 1, h.y0 + b * s, h.x0 + c2 * s + 1, h.y0 + d * s, blue);
    }
  } else if (pt === 6) {
    const ink = C('#101014');
    if (s > 1) { p.put(h.x0 + 2 * s - 2, h.y0 + 4 * s - 1, ink); p.put(h.x0 + 6 * s + 2, h.y0 + 4 * s - 1, ink); p.hline(h.x0 + 3 * s - 1, h.x0 + 3 * s + 1, h.y0 + 4 * s - 1, ink); p.hline(h.x0 + 6 * s - 1, h.x0 + 6 * s + 1, h.y0 + 4 * s - 1, ink); }
    const lip = C('#c0283a');
    p.hline(h.x0 + 4 * s, h.x0 + 5 * s + (s > 1 ? 1 : 0), h.y0 + 6 * s + (s > 1 ? 1 : 0), lip);
  }
}

/** Capacete de robô (dupla francesa): cobre a cabeça toda. */
function drawHelmet(h: HeadCtx): void {
  const gold = h.look.helm === 2;
  const m = C(gold ? '#d8b048' : '#c8ccd6');
  const md = shade(m, -0.3);
  const ml = shade(m, 0.35);
  R(h, 0, -2, 8, 1, m); R(h, -1, -1, 10, 9, m); R(h, 0, 8, 8, 1, md); R(h, 8, -1, 1, 9, md); R(h, 0, -1, 2, 6, ml);
  if (h.view !== 'front') return;
  const v = C('#0a0a10');
  if (gold) { R(h, 0, 2, 8, 5, v); R(h, 1, 7, 6, 1, v); R(h, 3, 1, 2, 1, v); if (h.s > 1) h.p.hline(h.x0 + 2, h.x0 + 13, h.y0 + 5, withAlpha(C('#ffe0a0'), 140)); }
  else { R(h, -1, 3, 10, 3, v); if (h.s > 1) for (let x = 1; x < 15; x += 3) h.p.put(h.x0 + x, h.y0 + 8, C('#ff3a3a')); }
}

function drawHat(h: HeadCtx): void {
  if (!h.look.hat) return;
  if (h.look.hatT) { drawHatType(h, h.look.hatT); return; }
  const c = h.col;
  const e = h.era;
  const dark = tone(C('#2c2622'), PALETTES[e]);
  if (e === '1920' || e === '1950') {
    const hc = e === '1920' ? dark : tone(C('#5a4a3a'), PALETTES[e]);
    R(h, -2, 0, 12, 1, hc);
    R(h, 0, -3, 8, 3, hc);
    R(h, 0, -1, 8, 1, c.accent);
    R(h, 1, -3, 3, 1, shade(hc, 0.2));
  } else if (e === '1960') {
    R(h, -1, -1, 10, 2, c.clothD);
    R(h, 1, -2, 6, 1, c.clothD);
    R(h, 7, 0, 3, 1, shade(c.clothD, -0.2));
  } else if (e === '1980') {
    R(h, 0, 2, 8, 1, c.accent);
  } else if (e === '1990') {
    R(h, 0, -2, 8, 3, c.cloth);
    R(h, 1, -2, 3, 1, c.clothL);
    if (h.view === 'front') R(h, -2, 0, 3, 1, c.clothD);
    else R(h, 6, 0, 4, 1, c.clothD);
  } else if (e === '2000' || e === '2010') {
    for (let v = -3; v <= 0; v++) R(h, v === -3 ? 1 : 0, v, v === -3 ? 6 : 8, 1, v % 2 ? c.cloth : c.clothD);
    R(h, 0, 1, 8, 1, c.clothD);
  } else if (e === '2020') {
    R(h, -1, 0, 10, 1, c.cloth);
    R(h, 1, -3, 6, 3, c.cloth);
    R(h, 1, -3, 2, 1, c.clothL);
  } else {
    // viseira holográfica
    R(h, -1, 3, 10, 2, withAlpha(c.glow, 150));
    R(h, -1, 3, 10, 1, withAlpha(C('#ffffff'), 120));
  }
}

/** Rodada 17: entradas/calvície — o cabelo some do alto da testa (o fundo volta acima do crânio). */
function recede(h: HeadCtx, pre: Px): void {
  const { p, col, s } = h;
  const bl = h.look.bl ?? 0;
  const x0 = h.x0 + (bl >= 2 ? 1 : 2) * s, x1 = h.x0 + (bl >= 2 ? 7 : 6) * s;
  const isHair = (v: Col) => v === col.hair || v === col.hairD || v === col.hairL;
  for (let y = h.y0 - 5 * s; y < h.y0 + (bl >= 2 ? 2 : 1) * s; y++) for (let x = x0; x < x1; x++) {
    if (!isHair(p.get(x, y))) continue;
    p.put(x, y, y < h.y0 ? pre.get(x, y) : y === h.y0 ? col.skinL : col.skin);
  }
}

function drawHead(h: HeadCtx): void {
  if (h.look.helm) { drawSkull(h); drawHelmet(h); return; }
  const pre = h.look.bl ? h.p.clone() : null;
  if (h.look.paint && WHITE_PAINT.includes(h.look.paint)) { const W = C('#f2f0ea'); h = { ...h, col: { ...h.col, skin: W, skinD: shade(W, -0.12), skinL: W } }; }
  const hairFn = HAIR[h.look.hair % HAIR.length];
  // rodada 15: cabelos volumosos (black, bufante, cachos) vão atrás do rosto; só o topo fica na frente
  const back = h.view === 'front' && BACK_HAIR.includes(h.look.hair % HAIR.length);
  if (back) hairFn(h, h.col);
  drawSkull(h);
  drawPaintUnder(h);
  if (h.view === 'front') drawFace(h);
  drawPaintOver(h);
  drawBeard(h);
  if (back) {
    const q = h.p.clone();
    hairFn({ ...h, p: q }, h.col);
    for (let y = h.y0 - 8 * h.s; y < h.y0 + 2 * h.s; y++) for (let x = h.x0 - 4 * h.s; x < h.x0 + 12 * h.s; x++) { const v = q.get(x, y); if (v !== h.p.get(x, y)) h.p.put(x, y, v); }
  } else hairFn(h, h.col);
  if (h.look.roots !== undefined && h.look.hair > 0) {
    // raiz de outra cor (cabelo bicolor)
    const rc = tone(C(HAIR_COLORS[h.look.roots % HAIR_COLORS.length]), PALETTES[h.era]);
    const { p, col } = h;
    for (let y = h.y0 - 4 * h.s; y < h.y0 + 1 * h.s; y++) for (let x = h.x0 - 3 * h.s; x < h.x0 + 11 * h.s; x++) {
      const v = p.get(x, y);
      if (v === col.hair) p.put(x, y, rc); else if (v === col.hairD) p.put(x, y, shade(rc, -0.3)); else if (v === col.hairL) p.put(x, y, shade(rc, 0.25));
    }
  }
  if (pre && h.look.hair > 0 && !h.look.hat && !h.look.hatT) recede(h, pre);
  drawGlasses(h);
  drawHat(h);
  if (h.s > 1 && h.look.hair > 0 && h.look.hair !== 3) {
    // brilho no cabelo do retrato
    const { p } = h;
    for (let y = h.y0 - 8; y < h.y0 + 4; y++)
      for (let x = h.x0; x < h.x0 + 16; x++)
        if (p.get(x, y) === h.col.hair && dith(x, y, 0.22) && (x + y) % 3 === 0) p.put(x, y, h.col.hairL);
  }
}

// ---------- corpo ----------

interface FigOpts {
  view: 'front' | 'back';
  pose: Pose;
  frame: number;
  role: Role | null;
  carry: boolean;
  variant: number;
}

interface Pt { x: number; y: number }

const CX = 12;
const GROUND = 31;
export const AV_W = 24;
export const AV_H = 34;

function guitarColor(e: EraId, bass: boolean): Col {
  const m: Record<EraId, string> = { '1920': '#b07a40', '1950': '#d8842a', '1960': '#c0342a', '1980': '#ff4fa3', '1990': '#262428', '2000': '#2f6ad8', '2010': '#c89a60', '2020': '#7ad0b8', '2030': '#5ffff0' };
  return bass ? shade(C(m[e]), -0.25) : C(m[e]);
}

function arm(p: Px, sh: Pt, hand: Pt, sleeve: Col, skin: Col, sleeveFrac: number, side: -1 | 1): void {
  const dx = hand.x - sh.x;
  const dy = hand.y - sh.y;
  const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(sh.x + (dx * i) / n);
    const y = Math.round(sh.y + (dy * i) / n);
    const c = i / n <= sleeveFrac ? sleeve : skin;
    p.put(x, y, c);
    p.put(x + side, y, i / n <= sleeveFrac ? shade(sleeve, side > 0 ? -0.15 : 0.08) : shade(skin, side > 0 ? -0.12 : 0));
  }
  p.put(hand.x, hand.y, skin);
  p.put(hand.x + side, hand.y, skin);
  p.put(hand.x, hand.y + 1, shade(skin, -0.12));
  p.put(hand.x + side, hand.y + 1, shade(skin, -0.12));
}

function drawFigure(p: Px, look: Appearance, pal: Palette, o: FigOpts): void {
  const col = colorsFor(look, pal);
  const e = pal.era;
  const hw = [3, 4, 4][look.body % 3];
  const heavy = look.body === 2;
  const sitting = o.pose === 'sit' || o.pose === 'sitplay';
  const walk = o.pose === 'walk';
  const f = o.frame;
  const liftL = walk && f % 4 === 1 ? 2 : 0;
  const liftR = walk && f % 4 === 3 ? 2 : 0;
  let bob = walk && f % 2 === 1 ? -1 : 0;
  if (o.pose === 'play' && (o.role === 'vocal' || o.role === 'guitar' || o.role === 'mc' || o.role === 'dj') && f % 2 === 1) bob = -1;
  if (sitting) bob += 3;
  const swing = walk ? [0, 1, 0, -1][f % 4] : 0;
  const ty0 = 15 + bob; // ombros
  const ty1 = 22 + bob; // cintura
  const hip = ty1 + 1;
  const front = o.view === 'front';

  // ---- pernas ----
  const outfit = look.outfit % 4;
  const dress = outfit === 2 && look.sx !== 'm'; // rodada 15: homem de casaco longo usa calça
  const legC = dress ? (e === '1920' ? tone(C('#6a5040'), pal) : col.skin) : col.pants;
  const legD = dress ? (e === '1920' ? shade(legC, -0.2) : col.skinD) : col.pantsD;
  const baggy = e === '1990' && !dress ? 1 : 0;
  const drawLeg = (x0: number, w: number, lift: number, dark: boolean) => {
    const footY = GROUND - lift;
    const c = dark ? legD : legC;
    if (sitting) {
      // coxas em escorço e canelas
      p.rect(x0, hip, w + 1, 2, shade(c, 0.1));
      p.rect(x0 + 1, hip + 2, w, footY - 1 - (hip + 2), c);
    } else {
      p.rect(x0, hip, w, footY - 1 - hip, c);
      if (e === '1960' && !dress) { p.put(x0 - 1, footY - 2, c); p.put(x0 + w, footY - 2, c); }
    }
    const sx = sitting ? x0 + 1 : x0;
    p.rect(sx, footY - 1, w + (front ? 1 : 0), 2, col.shoe);
    p.hline(sx, sx + w - (front ? 0 : 1), footY - 1, shade(col.shoe, 0.18));
    if (e === '2030') p.hline(sx, sx + w, footY, withAlpha(col.glow, 220));
  };
  const lw = hw;
  drawLeg(CX - lw - baggy, lw + baggy, liftL, false);
  drawLeg(CX, lw + baggy, liftR, true);
  if (!sitting && !dress) p.vline(CX - 1, hip, hip + 1, col.pantsD);

  // ---- tronco ----
  const tx0 = CX - hw - (heavy ? 0 : 0);
  const tw = hw * 2;
  const shoulderPad = e === '1980' && outfit === 1 ? 1 : 0;
  const torso = (c: Col) => {
    p.rect(tx0 - shoulderPad, ty0, tw + shoulderPad * 2, 1, c);
    p.rect(tx0, ty0 + 1, tw, ty1 - ty0, c);
    if (heavy) p.rect(tx0 - 1, ty0 + 3, tw + 2, ty1 - ty0 - 3, c);
    p.vline(tx0 + tw - 1 + (heavy ? 1 : 0), ty0 + 1, ty1, shade(c, -0.18));
    p.hline(tx0, tx0 + tw - 1, ty0, shade(c, 0.12));
  };
  let sleeve = col.cloth;
  let sleeveFrac = 0.75;
  if (outfit === 0) {
    // casual
    const tee = e === '1920' ? col.shirt : col.cloth;
    torso(tee);
    sleeve = tee;
    sleeveFrac = e === '1920' || e === '1950' ? 0.75 : 0.35;
    if (front) {
      p.put(CX - 1, ty0, col.skin);
      p.put(CX, ty0, col.skinD);
      if (e === '1920') { p.vline(tx0 + 1, ty0, ty1, col.cloth); p.vline(tx0 + tw - 2, ty0, ty1, col.clothD); }
      if (e === '1960') for (let y = ty0 + 2; y <= ty1; y += 2) p.hline(tx0, tx0 + tw - 1, y, col.clothL);
      if (e === '1980') { p.rect(CX - 2, ty0 + 2, 4, 3, col.accent); p.put(CX - 1, ty0 + 3, C('#ffffff')); }
      if (e === '1990') { p.fill((x, y) => (((x >> 1) + (y >> 1)) % 2 ? col.clothD : 0), tx0, ty0, tw, ty1 - ty0 + 1); p.vline(CX - 1, ty0 + 1, ty1, col.shirt); p.vline(CX, ty0 + 1, ty1, shade(col.shirt, -0.1)); }
      if (e === '2000') p.rect(CX - 2, ty0 + 2, 3, 3, col.clothL);
      if (e === '2030') p.vline(tx0 + 1, ty0 + 1, ty1, withAlpha(col.glow, 220));
    }
    p.hline(tx0, tx0 + tw - 1, ty1, e === '1920' ? col.clothD : shade(col.pants, -0.1)); // cinto
  } else if (outfit === 1) {
    // paletó / terno
    torso(col.cloth);
    sleeve = col.cloth;
    sleeveFrac = e === '1980' ? 0.6 : 0.85;
    if (front) {
      const inner = e === '1960' ? col.clothD : col.shirt;
      for (let y = ty0; y <= ty0 + 4; y++) { const wv = Math.max(0, 2 - Math.floor((y - ty0) / 2)); p.hline(CX - 1 - wv + 1, CX + wv - 1, y, inner); }
      p.vline(CX - 1, ty0, ty1 - 1, inner);
      p.vline(CX, ty0, ty0 + 3, inner);
      if (e === '1920' || e === '1950' || e === '1990' || e === '2010') p.vline(CX - 1, ty0 + 1, ty0 + 5, col.accent); // gravata
      p.put(CX - 2, ty0 + 1, col.clothL);
      p.put(CX + 1, ty0 + 1, col.clothD);
      if (e === '2030') { p.hline(tx0, tx0 + tw - 1, ty0, withAlpha(col.glow, 220)); }
      p.put(CX + 1, ty0 + 5, col.clothD);
    }
  } else if (outfit === 2) {
    // vestido / casaco longo
    torso(col.cloth);
    sleeve = col.cloth;
    sleeveFrac = e === '1960' || e === '1990' || e === '2000' ? 0 : e === '1920' ? 0.2 : 0.5;
    const hem = e === '1960' ? hip + 2 : e === '1920' ? hip + 4 : hip + 5;
    for (let y = ty1; y <= Math.min(hem, GROUND - 3); y++) {
      const flare = Math.floor((y - ty1) / 2);
      p.hline(tx0 - flare, tx0 + tw - 1 + flare, y, y === hem ? col.clothD : col.cloth);
      p.put(tx0 + tw - 1 + flare, y, col.clothD);
    }
    if (front) {
      p.hline(CX - 1, CX, ty0, col.skin);
      if (e === '1950') for (let y = ty0 + 1; y <= hem; y += 3) for (let x = tx0 - 1; x <= tx0 + tw; x += 3) p.put(x + (y % 2), y, col.shirt);
      if (e === '1920') for (let x = tx0 - 2; x <= tx0 + tw + 1; x += 2) p.put(x, hem + 1, col.clothD);
      if (e === '1980') p.hline(tx0, tx0 + tw - 1, ty1 - 1, col.accent);
      if (e === '2030') p.hline(tx0 - 2, tx0 + tw + 1, Math.min(hem, GROUND - 3), withAlpha(col.glow, 220));
    }
  } else {
    // malha / moletom / colete
    const body = col.cloth;
    torso(body);
    sleeve = e === '1920' ? col.shirt : body;
    sleeveFrac = 0.8;
    if (front) {
      if (e === '1920') { p.vline(CX - 1, ty0, ty0 + 2, col.shirt); p.put(CX - 1, ty0 + 4, C('#e8c040')); }
      if (e === '1950') for (let y = ty0 + 1; y < ty1; y += 2) p.put(CX - 1, y, col.shirt);
      if (e === '1960') p.hline(tx0 + 1, tx0 + tw - 2, ty0, col.clothD);
      if (e === '1980') { p.vline(tx0, ty0, ty1, col.shirt); p.vline(tx0 + tw - 1, ty0, ty1, col.shirt); }
      if (e === '1990' || e === '2000' || e === '2030') { p.rect(CX - 2, ty1 - 3, 4, 2, col.clothD); p.put(CX - 2, ty0 + 1, col.shirt); p.put(CX + 1, ty0 + 1, col.shirt); }
      if (e === '2000') p.vline(CX - 1, ty0, ty1, C('#c8c8d0'));
      if (e === '2020') for (let y = ty0 + 1; y <= ty1; y += 2) p.hline(tx0, tx0 + tw - 1, y, col.clothD);
      if (e === '2030') p.vline(CX, ty0, ty1, withAlpha(col.glow, 220));
    } else if (e === '1990' || e === '2000' || e === '2030') {
      p.rect(CX - 3, ty0, 6, 2, col.clothD); // capuz
    }
  }

  // pescoço
  p.rect(CX - 1, ty0 - 1, 2, 1, col.skinD);

  // ---- cabeça ----
  const hx0 = CX - 4;
  const hy0 = ty0 - 9;
  const head: HeadCtx = { p, x0: hx0, y0: hy0, s: 1, col, look, era: e, view: o.view, blink: (o.pose === 'stand' || sitting) && f % 4 === 3 };
  drawHead(head);
  if ((o.role === 'producer' || o.role === 'dj') && (o.pose === 'play' || o.pose === 'sitplay')) {
    // fones
    p.vline(hx0 - 1, hy0 + 2, hy0 + 5, C('#2a2a2e'));
    p.vline(hx0 + 8, hy0 + 2, hy0 + 5, C('#2a2a2e'));
    p.hline(hx0, hx0 + 7, hy0 - 1, C('#3a3a40'));
    p.put(hx0 - 1, hy0 + 3, col.accent);
  }

  // ---- braços e instrumento ----
  const shL: Pt = { x: tx0 - 1 - shoulderPad, y: ty0 + 1 };
  const shR: Pt = { x: tx0 + tw + shoulderPad, y: ty0 + 1 };
  let hL: Pt = { x: shL.x - (heavy ? 1 : 0), y: ty0 + 6 + swing };
  let hR: Pt = { x: shR.x + (heavy ? 1 : 0), y: ty0 + 6 - swing };
  const extras: (() => void)[] = [];
  const role = o.role;
  const playing = o.pose === 'play' || o.pose === 'sitplay';
  const alt = f % 2;
  if (playing && front && role) {
    switch (role) {
      case 'guitar':
      case 'bass': {
        const bass = role === 'bass';
        const gc = guitarColor(e, bass);
        const by = ty0 + 7;
        extras.push(() => {
          const nx = CX + (bass ? 9 : 7);
          const ny = ty0 + (bass ? -1 : 1);
          p.line(CX - 1, by - 1, nx, ny, C('#4a2a14'));
          p.line(CX - 1, by, nx, ny + 1, C('#6a4a24'));
          p.rect(nx, ny - 1, 2, 2, C('#2a1a10'));
          p.disc(CX - 2.5, by + 1.5, 3.2, gc);
          p.disc(CX - 0.5, by - 0.5, 2.3, gc);
          p.put(CX - 3, by, shade(gc, 0.3));
          if (e === '1920' || e === '1950') p.put(CX - 1, by, C('#1a1210'));
          else { p.hline(CX - 3, CX - 1, by + 1, C('#e0e0e0')); }
          p.hline(CX - 4, CX - 2, by + 4, shade(gc, -0.3));
        });
        hL = { x: CX - 2, y: by + (alt ? 1 : -1) };
        hR = { x: CX + (bass ? 6 : 5), y: ty0 + (bass ? 1 : 3) };
        break;
      }
      case 'vocal': {
        extras.push(() => {
          const sx = CX + 5;
          p.vline(sx, hy0 + 7, GROUND - 1, C('#4a4a50'));
          p.hline(sx - 2, sx + 2, GROUND, C('#3a3a40'));
          p.line(sx, hy0 + 7, CX + 3, hy0 + 6, C('#4a4a50'));
          p.rect(CX + 2, hy0 + 5, 2, 2, e === '1920' || e === '1950' ? C('#c9c2a8') : C('#7a7a80'));
          p.put(CX + 2, hy0 + 5, C('#d8d8d8'));
        });
        hR = { x: CX + 3, y: hy0 + 8 };
        hL = alt ? { x: shL.x - 3, y: ty0 - 1 } : { x: shL.x - 1, y: ty0 + 5 };
        break;
      }
      case 'mc': {
        extras.push(() => { p.vline(CX + 3, hy0 + 7, hy0 + 9, C('#2a2a2e')); p.rect(CX + 2, hy0 + 5, 2, 2, C('#9a9aa0')); });
        hR = { x: CX + 3, y: hy0 + 9 };
        hL = alt ? { x: shL.x - 3, y: ty0 - 2 } : { x: shL.x - 2, y: ty0 + 3 };
        break;
      }
      case 'keys': {
        const ky = ty0 + 6;
        const kc = e === '1960' || e === '1920' || e === '1950' ? shade(C(pal.era === '1920' ? '#5a3820' : '#7a4a26'), 0) : e === '1980' ? C('#2a2a30') : e === '2030' ? withAlpha(C('#2ee8d8'), 200) : C('#1e1e22');
        extras.push(() => {
          p.rect(CX - 8, ky, 16, 3, kc);
          p.hline(CX - 7, CX + 6, ky, C('#f4f0e6'));
          for (let x = CX - 7; x <= CX + 6; x += 2) p.put(x, ky, C('#1a1a1a'));
          if (e === '1980') { p.put(CX + 5, ky + 1, C('#ff4fa3')); p.put(CX + 3, ky + 1, C('#35e0e0')); }
          p.line(CX - 6, ky + 3, CX + 5, GROUND, C('#3a3a40'));
          p.line(CX + 5, ky + 3, CX - 6, GROUND, C('#3a3a40'));
        });
        hL = { x: CX - 4 + alt, y: ky - 1 };
        hR = { x: CX + 3 - alt, y: ky - 1 };
        break;
      }
      case 'horns': {
        const gold = C('#e8b830');
        if (o.variant % 2 === 0) {
          extras.push(() => {
            p.line(CX + 1, hy0 + 6, CX + 2, ty0 + 1, C('#2a2a2a'));
            p.rect(CX + 1, ty0 + 1, 2, 7, gold);
            p.put(CX + 2, ty0 + 2, shade(gold, 0.35));
            p.rect(CX + 2, ty0 + 7, 3, 2, gold);
            p.rect(CX + 4, ty0 + 4, 2, 4, shade(gold, -0.2));
            p.put(CX + 4, ty0 + 4, C('#5a4010'));
          });
          hL = { x: CX, y: ty0 + 3 + alt };
          hR = { x: CX + 2, y: ty0 + 6 };
        } else {
          extras.push(() => {
            p.hline(CX + 1, CX + 7, hy0 + 6, gold);
            p.hline(CX + 3, CX + 6, hy0 + 7, shade(gold, -0.2));
            p.rect(CX + 8, hy0 + 4, 2, 5, gold);
            p.put(CX + 9, hy0 + 6, C('#5a4010'));
          });
          hL = { x: CX + 3, y: hy0 + 8 };
          hR = { x: CX + 5, y: hy0 + 7 + alt };
        }
        break;
      }
      case 'dj': {
        const ty = ty0 + 6;
        extras.push(() => {
          p.rect(CX - 9, ty, 18, 3, C('#26262c'));
          p.hline(CX - 9, CX + 8, ty, C('#4a4a54'));
          p.ellipse(CX - 4.5, ty - 0.5, 3, 1.2, C('#1a1a1a'));
          p.ellipse(CX + 4.5, ty - 0.5, 3, 1.2, C('#1a1a1a'));
          p.put(CX - 5 + alt, ty - 1, col.accent);
          p.put(CX + 4, ty - 1, col.accent);
          p.vline(CX - 8, ty + 3, GROUND, C('#3a3a40'));
          p.vline(CX + 7, ty + 3, GROUND, C('#3a3a40'));
        });
        hL = { x: CX - 5 + alt, y: ty - 2 };
        hR = { x: CX + 4, y: ty - 2 - alt };
        break;
      }
      case 'producer': {
        if (o.pose === 'play') {
          extras.push(() => { p.rect(CX - 3, ty0 + 4, 7, 4, C('#9aa0aa')); p.rect(CX - 2, ty0 + 5, 5, 2, withAlpha(col.glow, 230)); });
          hL = { x: CX - 3, y: ty0 + 6 };
          hR = { x: CX + 3, y: ty0 + 6 };
        } else {
          hL = { x: CX - 3 + alt, y: ty0 + 6 };
          hR = { x: CX + 3, y: ty0 + 6 - alt };
        }
        break;
      }
      case 'strings': {
        if (o.variant % 2 === 0) {
          extras.push(() => {
            p.ellipse(CX - 2.5, ty0 + 1.5, 2.2, 1.6, C('#9a4a1c'));
            p.line(CX - 3, ty0 + 1, CX - 8, ty0 - 1, C('#3a2010'));
            p.line(CX + 6, ty0 - 2 + alt * 2, CX - 1, ty0 + 4 - alt, C('#d8c8a0'));
          });
          hL = { x: CX - 8, y: ty0 - 1 };
          hR = { x: CX + 5, y: ty0 - 1 + alt * 2 };
        } else {
          extras.push(() => {
            p.vline(CX - 6, hy0 + 2, GROUND, C('#3a2010'));
            p.ellipse(CX - 6, ty0 + 9, 4, 4.5, C('#8a3a14'));
            p.ellipse(CX - 6, ty0 + 4, 3, 2.5, C('#8a3a14'));
            p.put(CX - 7, ty0 + 7, C('#c06a2a'));
            p.vline(CX - 6, ty0 + 2, ty0 + 12, C('#2a1a10'));
          });
          hL = { x: CX - 6, y: ty0 + 1 };
          hR = { x: CX - 3, y: ty0 + 8 + alt };
        }
        break;
      }
      case 'drums': {
        const up = alt ? 2 : 0;
        hL = { x: shL.x - 1, y: ty0 + 3 + up };
        hR = { x: shR.x + 1, y: ty0 + 5 - up };
        extras.push(() => {
          p.line(hL.x, hL.y, hL.x + 3, hL.y + 3, C('#e0c890'));
          p.line(hR.x, hR.y, hR.x - 2, hR.y + 4, C('#e0c890'));
        });
        break;
      }
      case 'synthetic':
        hL = { x: shL.x - 2, y: ty0 + 2 + alt };
        hR = { x: shR.x + 2, y: ty0 + 2 - alt };
        break;
    }
  } else if (o.carry && role) {
    // carregando o instrumento (ou estojo)
    const caseC = C('#2a2220');
    if (role === 'guitar' || role === 'bass' || (role === 'strings' && o.variant % 2 === 1)) {
      extras.push(() => { p.rect(hR.x + 1, hR.y - 6, 3, 12, caseC); p.rect(hR.x + 1, hR.y - 6, 1, 12, shade(caseC, 0.25)); p.put(hR.x + 2, hR.y + 1, C('#c0a040')); });
    } else if (role === 'horns' || role === 'strings' || role === 'keys') {
      extras.push(() => { p.rect(hR.x, hR.y + 1, 5, 4, caseC); p.hline(hR.x, hR.x + 4, hR.y + 1, shade(caseC, 0.3)); });
    } else if (role === 'vocal' || role === 'mc') {
      extras.push(() => { p.rect(hR.x, hR.y - 2, 2, 2, C('#9a9aa0')); p.vline(hR.x, hR.y, hR.y + 1, C('#2a2a2e')); });
    } else if (role === 'drums') {
      extras.push(() => { p.line(hR.x, hR.y + 1, hR.x + 3, hR.y + 5, C('#e0c890')); p.line(hR.x + 1, hR.y + 1, hR.x + 4, hR.y + 4, C('#e0c890')); });
    } else if (role === 'producer' || role === 'dj') {
      extras.push(() => { p.hline(hx0, hx0 + 7, ty0 - 1, C('#2a2a2e')); p.put(hx0, ty0 - 1, col.accent); });
    }
  }
  if (sitting && !playing) {
    hL = { x: CX - 3, y: ty0 + 6 };
    hR = { x: CX + 2, y: ty0 + 6 };
  }
  if (!front) {
    // de costas: instrumento atrás do corpo não aparece; braços simples
    arm(p, shL, hL, sleeve, col.skin, sleeveFrac, -1);
    arm(p, shR, hR, shade(sleeve, -0.1), col.skinD, sleeveFrac, 1);
    for (const x of extras) if (o.carry) x();
    return;
  }
  for (const x of extras) x();
  arm(p, shL, hL, sleeve, col.skin, sleeveFrac, -1);
  arm(p, shR, hR, shade(sleeve, -0.1), col.skin, sleeveFrac, 1);
}

function hologram(p: Px, pal: Palette, frame: number): void {
  const g = C('#5ffff0');
  p.map((c, _x, y) => {
    const a = c >>> 24;
    if (a < 30) return c;
    const lum = ((c & 255) + ((c >>> 8) & 255) + ((c >>> 16) & 255)) / 765;
    let out = mix(shade(g, -0.55), C('#d8fffb'), lum);
    if ((y + frame) % 3 === 0) out = shade(out, -0.35);
    return withAlpha(out, 205);
  });
  void pal;
}

// ---------- API de sprites ----------

const spriteCache = new Map<string, Sprite>();

export interface AvatarOpts {
  year: number;
  role?: Role | null;
  pose?: Pose;
  dir?: Dir;
  frame?: number;
  carry?: boolean;
  /** 0/1: sax × trompete, violino × baixo acústico */
  variant?: number;
  synthetic?: boolean;
}

/** Sprite isométrico 24×34 com âncora nos pés (12, 31). */
export function avatarSprite(look: Appearance, o: AvatarOpts): Sprite {
  const era = eraOf(o.year);
  const pose = o.pose ?? 'stand';
  const dir = o.dir ?? 'SE';
  const frame = pose === 'walk' ? (o.frame ?? 0) % 4 : (o.frame ?? 0) % 4;
  const role = o.role ?? null;
  const synth = o.synthetic || role === 'synthetic';
  const key = `${lookKey(look)}|${era}|${role}|${pose}|${dir}|${frame}|${o.carry ? 1 : 0}|${o.variant ?? 0}|${synth ? 1 : 0}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const pal = PALETTES[era];
  const p = new Px(AV_W, AV_H);
  const view = dir === 'SE' || dir === 'SW' ? 'front' : 'back';
  drawFigure(p, look, pal, { view, pose, frame, role: role === 'synthetic' ? 'synthetic' : role, carry: !!o.carry, variant: o.variant ?? 0 });
  let out = p;
  if (dir === 'SW' || dir === 'NW') {
    out = new Px(AV_W, AV_H);
    out.blit(p, 0, 0, true);
  }
  if (synth) {
    hologram(out, pal, frame);
    out.outline(withAlpha(C('#2ee8d8'), 140));
  } else out.outline(pal.outline);
  const sp: Sprite = { c: out.canvas(), ax: CX, ay: GROUND };
  spriteCache.set(key, sp);
  return sp;
}

// ---------- retrato ----------

const portraitCache = new Map<string, HTMLCanvasElement>();
const portraitUrlCache = new Map<string, string>();

type PersonLike = { id: string; look?: Appearance; role?: Role; born?: number };

/** Busto 32×32 de frente. */
export function portraitPx(person: PersonLike, year: number): Px {
  const look = lookOf(person);
  const pal = PALETTES[eraOf(year)];
  const col = colorsFor(look, pal);
  const p = new Px(32, 32);
  // fundo: placa arredondada na cor da era
  const bgA = mix(pal.wall, pal.bg, 0.25);
  const bgB = shade(bgA, -0.18);
  p.fill((x, y) => {
    const inside = !((x < 2 || x > 29) && (y < 2 || y > 29)) && !((x === 0 || x === 31) && (y < 3 || y > 28)) && !((y === 0 || y === 31) && (x < 3 || x > 28));
    if (!inside) return 0;
    return y > 20 && dith(x, y, (y - 20) / 14) ? bgB : bgA;
  });
  if (person.role === 'synthetic') p.fill((x, y) => (y % 3 === 0 ? withAlpha(C('#2ee8d8'), 40) : 0));
  // ombros e roupa
  const outfit = look.outfit % 4;
  const shirtC = outfit === 0 && pal.era === '1920' ? col.shirt : col.cloth;
  const w = [9, 11, 12][look.body % 3];
  for (let y = 24; y < 32; y++) {
    const ww = w + Math.min(3, y - 24);
    p.hline(16 - ww, 15 + ww, y, y === 24 ? shade(shirtC, 0.15) : shirtC);
    p.put(15 + ww, y, shade(shirtC, -0.2));
  }
  // pescoço
  p.rect(14, 21, 4, 4, col.skinD);
  p.rect(14, 21, 3, 3, col.skin);
  if (outfit === 1) {
    const inner = pal.era === '1960' ? col.clothD : col.shirt;
    p.poly([[12.5, 24], [19.5, 24], [16, 31]], inner);
    if (pal.era !== '1960') p.rect(15, 25, 2, 6, col.accent);
    p.line(12, 24, 15, 31, shade(col.cloth, 0.2));
    p.line(19, 24, 17, 31, shade(col.cloth, -0.25));
  } else if (outfit === 3) {
    p.rect(12, 24, 8, 2, col.clothD);
    p.vline(14, 26, 29, col.shirt);
    p.vline(17, 26, 29, col.shirt);
  } else if (outfit === 2) {
    p.poly([[13, 24], [19, 24], [16, 27]], col.skin);
  } else {
    p.rect(14, 24, 4, 1, col.skinD);
    if (pal.era === '1990') p.fill((x, y) => (((x >> 1) + (y >> 1)) % 2 ? col.clothD : 0), 4, 25, 24, 7);
  }
  const head: HeadCtx = { p, x0: 8, y0: 6, s: 2, col, look, era: pal.era, view: 'front' };
  drawHead(head);
  if (person.role === 'synthetic') hologram(p, pal, 0);
  p.outline(pal.outline);
  return p;
}

/** Retrato ampliado em canvas (px = tamanho de cada pixel). */
export function portraitCanvas(person: PersonLike, s?: GameState | number | null, px = 3): HTMLCanvasElement {
  const year = typeof s === 'number' ? s : s?.year ?? 1960;
  const look = lookOf(person);
  const key = `${person.id}|${lookKey(look)}|${eraOf(year)}|${person.role}|${px}`;
  let c = portraitCache.get(key);
  if (!c) {
    c = upscale(portraitPx(person, year).canvas(), 32 * px);
    c.className = 'px portrait';
    portraitCache.set(key, c);
  }
  const copy = document.createElement('canvas');
  copy.width = c.width;
  copy.height = c.height;
  copy.className = 'px portrait';
  copy.getContext('2d')!.drawImage(c, 0, 0);
  return copy;
}

/** Data URL do retrato com `size` px (múltiplo de 32 fica perfeito). */
export function portraitDataUrl(person: PersonLike, size = 64, year = 1960): string {
  const look = lookOf(person);
  const key = `${person.id}|${lookKey(look)}|${eraOf(year)}|${person.role}|${size}`;
  let u = portraitUrlCache.get(key);
  if (!u) {
    u = upscale(portraitPx(person, year).canvas(), size).toDataURL();
    portraitUrlCache.set(key, u);
  }
  return u;
}

/** Variante estável por pessoa (sax × trompete etc.). */
export function variantOf(id: string): number {
  return hashString(id) % 2;
}
