// Pessoas em pixel art combináveis (GDD §44): corpo, rosto, pele, cabelo, roupa e acessórios
// em camadas separadas. Sprites isométricos em 4 direções (caminhada de 4 quadros, parado,
// sentado, tocando o instrumento do papel) e retrato de busto para fichas.

import { Rng, hashString } from '../../core/rng';
import type { Appearance, GameState, Person } from '../../sim/types';
import { PALETTES, eraOf, tone, type EraId, type Palette } from './palette';
import { C, Px, dith, mix, shade, upscale, withAlpha, type Col, type Sprite } from './px';
import { ageInfo, ageLook } from './age17';
import { HAIR_COUNT27, LONG27, flavor27, gate27, h27, instFor } from './looks27';

export type Dir = 'SE' | 'SW' | 'NE' | 'NW';
export type Pose = 'stand' | 'walk' | 'sit' | 'play' | 'sitplay';
export type Role = Person['role'];

export const SKINS = ['#f6d3b3', '#e0aa7e', '#a8714a', '#6e4528'];
export const HAIR_COLORS = ['#1e1814', '#3d2616', '#6e4426', '#8e3a1e', '#dcb862', '#c0602a', '#cfc9bf', '#4a6fd0', '#f1e9cf', '#d0302c', '#ee7cc0', '#8fe04a', '#7fb8e8'];
export const OUTFIT_COLORS = ['#2c4a7e', '#a33434', '#2f7a4c', '#d0a43c', '#6a4590', '#e4dccb', '#2a2a30', '#d8692a', '#d8b040', '#e070a8', '#b4b8c4', '#5e3c26', '#6ab0e0'];
export const HAIR_STYLES = HAIR_COUNT27; // rodada 27: 23 antigos + 14 novos (anexados)

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

/** Rodada 27: figurante procedural com a moda do ano (cache por semente e década). */
const crowd27 = new Map<string, Appearance>();
export function crowdLook27(seed: string, year: number): Appearance {
  const k = `${seed}|${Math.floor(year / 10)}`;
  let a = crowd27.get(k);
  if (!a) {
    if (crowd27.size > 3000) crowd27.clear();
    a = flavor27(randomLook(seed), seed, { year });
    crowd27.set(k, a);
  }
  return a;
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
  return `${a.body}${a.face}${a.skin}.${a.hair}.${a.hairColor}.${a.outfit}${a.outfitColor}${a.glasses ? 1 : 0}${a.hat ? 1 : 0}${a.beard ? 1 : 0}.${a.hatT ?? ''}${a.hatC ?? ''}.${a.glT ?? ''}${a.bdT ?? ''}${a.paint ?? ''}${a.helm ?? ''}.${a.roots ?? ''}${a.sx ?? ''}${a.ag || a.gy || a.bl ? `.${a.ag ?? 0}${a.gy ?? 0}${a.bl ?? 0}` : ''}${key27(a)}`;
}

/** Rodada 27: segmento só para visuais com peças novas (os antigos mantêm a chave de antes). */
function key27(a: Appearance): string {
  if (!(a.outfit >= 4 || a.nk || a.ear || a.tat || a.inst || (a.hatT ?? 0) >= 9)) return '';
  return `|n${a.outfit}:${a.hatT ?? ''}:${a.nk ?? ''}:${a.ear ?? ''}:${a.tat ?? ''}:${a.inst ?? ''}`;
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
  if (a.outfit === 8) pants = C('#1c1c22'); // rodada 27: smoking
  pants = t(pants);
  if (a.outfit === 12 || a.outfit === 16) pants = cloth; // agasalho e macacão: calça da mesma cor
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
  if (bt >= 4) { drawBeard27(h, bt); return; }
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

/** Rodada 27: costeletas, barba longa, bigode ferradura, bigodinho fino, barba de contorno. */
function drawBeard27(h: HeadCtx, bt: number): void {
  const { col, p, s } = h;
  const X = (u: number) => h.x0 + u * s;
  const Y = (v: number) => h.y0 + v * s;
  if (bt === 4) { // costeletas ligadas ao bigode (mutton chops)
    R(h, 0, 3, 1, 4, col.hair); R(h, 7, 3, 1, 4, col.hairD); R(h, 1, 5, 1, 2, col.hair); R(h, 6, 5, 1, 2, col.hairD);
    if (s > 1) { p.hline(X(2), X(6) - 1, Y(5) + 1, col.hair); p.put(X(2), Y(6), col.hairD); p.put(X(6) - 1, Y(6), col.hairD); }
    else R(h, 2, 5, 4, 1, col.hair);
  } else if (bt === 5) { // barba longa até o peito
    R(h, 0, 4, 1, 3, col.hair); R(h, 7, 4, 1, 3, col.hairD); R(h, 1, 6, 6, 3, col.hair); R(h, 6, 6, 1, 3, col.hairD);
    R(h, 2, 9, 4, 2, col.hair); R(h, 5, 9, 1, 2, col.hairD); R(h, 3, 11, 2, 1, col.hairD); R(h, 3, 5, 3, 1, col.hair);
    if (s > 1) { p.hline(X(4), X(6) - 1, Y(6) + 1, mix(col.hairD, C('#8a3a3a'), 0.4)); for (let v = 7; v < 11; v++) p.put(X(3) + (v % 2), Y(v) + 1, col.hairL); }
  } else if (bt === 6) { // ferradura: bigode que desce pelos cantos da boca
    if (s > 1) { p.hline(X(2) + 1, X(6) - 2, Y(5) + 1, col.hair); p.hline(X(2) + 1, X(6) - 2, Y(5) + 2, col.hairD); p.vline(X(2) + 1, Y(6), Y(8) - 1, col.hair); p.vline(X(6) - 2, Y(6), Y(8) - 1, col.hairD); }
    else { R(h, 2, 5, 4, 1, col.hair); R(h, 2, 6, 1, 2, col.hair); R(h, 5, 6, 1, 2, col.hairD); }
  } else if (bt === 7) { // bigodinho fino (anos 30–50)
    if (s > 1) p.hline(X(4) - 1, X(6) - 1, Y(6), col.hairD);
    else { p.put(X(4), Y(5), col.hairD); p.put(X(5), Y(5), col.hairD); }
  } else { // barba de contorno (chin strap)
    if (s > 1) { p.vline(X(0), Y(4), Y(7) - 1, col.hairD); p.vline(X(8) - 1, Y(4), Y(7) - 1, col.hairD); p.line(X(0), Y(7) - 1, X(2), Y(8) - 1, col.hairD); p.line(X(8) - 1, Y(7) - 1, X(6) - 1, Y(8) - 1, col.hairD); p.hline(X(2), X(6) - 1, Y(8) - 1, col.hairD); }
    else { R(h, 0, 5, 1, 2, col.hairD); R(h, 7, 5, 1, 2, col.hairD); R(h, 1, 7, 6, 1, col.hairD); }
  }
}

/** Rodada 27: aviador, aro grosso, gatinho, redondos coloridos, esportivo envolvente. */
function drawGlasses27(h: HeadCtx, gt: number): void {
  const { p, s } = h;
  const X = (u: number) => h.x0 + u * s;
  const Y = (v: number) => h.y0 + v * s;
  const frame = C(gt === 4 ? '#c8a24a' : gt === 5 ? '#141418' : gt === 6 ? '#8a1e3a' : gt === 7 ? '#b89a4a' : '#1a1a20');
  const lens = gt === 4 ? withAlpha(C('#5a3a24'), 215) : gt === 7 ? withAlpha(C('#e0782a'), 175) : gt === 8 ? C('#20242e') : withAlpha(C('#bfe0ff'), 120);
  if (gt === 8) { // uma lente só, de lado a lado
    if (s > 1) { p.rect(X(1), Y(4) - 1, X(8) - X(1), 3, lens); p.hline(X(1), X(8) - 1, Y(4) - 1, frame); p.hline(X(2), X(4), Y(4), withAlpha(C('#8ab0d0'), 160)); p.hline(X(0), X(1), Y(4), frame); }
    else p.hline(X(2), X(7), Y(4), lens);
    return;
  }
  if (s === 1) {
    p.set(X(2), Y(4), frame); p.set(X(3), Y(4), lens); p.set(X(4), Y(4), frame); p.set(X(5), Y(4), frame); p.set(X(6), Y(4), lens); p.set(X(7), Y(4), frame);
    if (gt === 5) { p.set(X(3), Y(4) - 1, frame); p.set(X(6), Y(4) - 1, frame); }
    if (gt === 6) { p.set(X(2), Y(3), frame); p.set(X(7), Y(3), frame); }
    return;
  }
  for (const ex of [3, 6]) {
    const x = X(ex) - 2;
    const y = Y(4) - 1;
    if (gt === 4) { p.hline(x, x + 4, y, frame); p.rect(x, y + 1, 5, 2, lens); p.rect(x + 1, y + 3, 3, 1, lens); p.vline(x, y, y + 2, frame); p.vline(x + 4, y, y + 2, frame); p.put(x + 1, y + 1, withAlpha(C('#f0d8a0'), 140)); }
    else if (gt === 5) { p.rect(x - 1, y - 1, 6, 5, frame); p.rect(x + 1, y + 1, 3, 2, lens); p.put(x + 1, y + 1, withAlpha(C('#ffffff'), 140)); }
    else if (gt === 6) { p.hline(x, x + 4, y, frame); p.hline(x + 1, x + 3, y + 3, frame); p.vline(x, y, y + 2, frame); p.vline(x + 4, y, y + 2, frame); p.rect(x + 1, y + 1, 3, 2, lens); if (ex === 3) { p.put(x - 1, y - 1, frame); p.put(x - 1, y, frame); } else { p.put(x + 5, y - 1, frame); p.put(x + 5, y, frame); } }
    else { p.hline(x + 1, x + 3, y, frame); p.hline(x + 1, x + 3, y + 3, frame); p.vline(x, y + 1, y + 2, frame); p.vline(x + 4, y + 1, y + 2, frame); p.rect(x + 1, y + 1, 3, 2, lens); }
  }
  p.hline(X(4) + 1, X(5), Y(4) - (gt === 4 ? 1 : 0), frame);
  p.hline(X(0), X(1), Y(4), frame);
}

function drawGlasses(h: HeadCtx): void {
  if (!h.look.glasses || h.view !== 'front') return;
  const e = h.era;
  const gt = h.look.glT ?? 0;
  if (gt >= 4) { drawGlasses27(h, gt); return; }
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
  // ---- rodada 27 (anexados; ver looks27.ts HAIR27) ----
  // 23 tranças longas (box braids)
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 2, c.hair); R(h, 0, 2, 1, 1, c.hair); R(h, 7, 2, 1, 1, c.hairD);
    const cols = h.view === 'front' ? [-1, 0, 7, 8] : [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (const u of cols) for (let v = 1; v < 13 - (u & 1); v++) R(h, u, v, 1, 1, (v + u) % 2 ? c.hairD : c.hair);
    for (const u of cols) R(h, u, 13 - (u & 1), 1, 1, c.hairL);
    R(h, 2, -1, 2, 1, c.hairL); R(h, 4, -1, 1, 2, c.hairD);
  },
  // 24 cortina (repartido ao meio)
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 2, c.hair);
    if (h.view === 'front') { R(h, 0, 2, 3, 1, c.hair); R(h, 5, 2, 3, 1, c.hairD); R(h, 0, 3, 1, 3, c.hair); R(h, 7, 3, 1, 3, c.hairD); R(h, 4, -1, 1, 3, c.hairD); }
    else R(h, 0, 0, 8, 6, c.hair);
    R(h, 1, -1, 2, 1, c.hairL); R(h, 5, -1, 2, 1, c.hairL);
  },
  // 25 permanente / jheri curl (cachos molhados, brilhantes)
  (h, c) => {
    R(h, 0, -2, 8, 1, c.hair); R(h, 1, -2, 2, 1, c.hairL); R(h, 5, -2, 1, 1, c.hairL);
    R(h, -1, -1, 10, 3, c.hair); R(h, -1, 2, 1, 4, c.hair); R(h, 8, 2, 1, 4, c.hairD); R(h, -1, 6, 1, 1, c.hairD); R(h, 8, 6, 1, 1, c.hairD);
    if (h.view === 'back') R(h, -1, -1, 10, 8, c.hair);
    for (let u = 0; u < 8; u += 2) R(h, u, 0, 1, 1, c.hairL);
    for (let u = -1; u <= 8; u += 3) R(h, u, 2, 1, 1, c.hairD);
    R(h, -1, 3, 1, 1, c.hairL); R(h, 8, 4, 1, 1, c.hairL);
  },
  // 26 high-top fade
  (h, c) => {
    const st = mix(c.hair, c.skin, 0.45);
    R(h, 0, 0, 8, 2, st); R(h, 0, 2, 1, 2, st); R(h, 7, 2, 1, 1, st);
    R(h, 1, -5, 6, 6, c.hair); R(h, 1, -5, 6, 1, c.hairL); R(h, 6, -4, 1, 5, c.hairD);
    if (h.view === 'back') R(h, 0, 1, 8, 5, st);
  },
  // 27 dois coquinhos afro (afro puffs)
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 2, c.hair); R(h, 0, 2, 1, 1, c.hair); R(h, 7, 2, 1, 1, c.hairD);
    if (h.view === 'back') R(h, 0, 0, 8, 6, c.hair); else R(h, 4, -1, 1, 1, c.hairD);
    for (const u of [-0.4, 8.4]) h.p.ellipse(h.x0 + u * h.s, h.y0 - 1.5 * h.s, 2.1 * h.s, 2 * h.s, (x, y) => (dith(x, y, 0.25) ? c.hairD : c.hair));
    R(h, -1, -3, 1, 1, c.hairL); R(h, 8, -3, 1, 1, c.hairL);
  },
  // 28 maria-chiquinha
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 2, c.hair); R(h, 0, 2, 1, 1, c.hair); R(h, 7, 2, 1, 1, c.hairD);
    if (h.view === 'back') R(h, 0, 0, 8, 5, c.hair); else R(h, 4, -1, 1, 2, c.hairD);
    R(h, -1, 3, 1, 1, c.accent); R(h, 8, 3, 1, 1, c.accent);
    R(h, -2, 4, 2, 5, c.hair); R(h, 8, 4, 2, 5, c.hairD); R(h, -2, 9, 1, 1, c.hair); R(h, 9, 9, 1, 1, c.hairD);
    R(h, 2, -1, 2, 1, c.hairL);
  },
  // 29 franja emo (cobre um olho)
  (h, c) => {
    R(h, 0, -2, 8, 1, c.hair); R(h, -1, -1, 10, 3, c.hair);
    if (h.view === 'front') { R(h, 3, 2, 5, 1, c.hair); R(h, 4, 3, 4, 1, c.hair); R(h, 5, 4, 3, 1, c.hairD); R(h, -1, 2, 1, 5, c.hair); R(h, 8, 2, 1, 5, c.hairD); }
    else R(h, -1, -1, 10, 8, c.hair);
    R(h, 1, -2, 3, 1, c.hairL); R(h, 3, 1, 3, 1, c.hairL);
  },
  // 30 undercut com coque
  (h, c) => {
    const st = mix(c.hair, c.skin, 0.55);
    R(h, 0, 1, 8, 1, st); R(h, 0, 2, 1, 2, st); R(h, 7, 2, 1, 1, st);
    R(h, 1, -1, 6, 2, c.hair); R(h, 0, 0, 8, 1, c.hair); R(h, 2, -3, 3, 2, c.hair); R(h, 3, -3, 1, 1, c.hairL); R(h, 2, -1, 4, 1, c.hairL);
    if (h.view === 'back') { R(h, 0, 1, 8, 5, st); R(h, 1, -1, 6, 2, c.hair); R(h, 3, -3, 2, 2, c.hairD); }
  },
  // 31 flat top
  (h, c) => {
    const st = mix(c.hair, c.skin, 0.3);
    R(h, 0, 0, 8, 2, st); R(h, 0, 2, 1, 2, st); R(h, 7, 2, 1, 1, st);
    R(h, 0, -3, 8, 3, c.hair); R(h, 0, -3, 8, 1, c.hairL); R(h, 7, -3, 1, 3, c.hairD);
    if (h.view === 'back') R(h, 0, 0, 8, 6, st);
  },
  // 32 ondas anos 20 (finger waves)
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 2, c.hair); R(h, -1, 1, 1, 5, c.hair); R(h, 8, 1, 1, 5, c.hairD);
    if (h.view === 'front') { R(h, 0, 2, 3, 1, c.hair); R(h, 0, 3, 1, 3, c.hair); R(h, 7, 2, 1, 4, c.hairD); }
    else R(h, -1, -1, 10, 7, c.hair);
    for (let u = 0; u < 8; u++) R(h, u, u % 4 < 2 ? -1 : 0, 1, 1, c.hairL);
    R(h, -1, 3, 1, 1, c.hairL); R(h, 8, 4, 1, 1, c.hairL);
  },
  // 33 raspado com risco
  (h, c) => {
    const st = mix(c.hair, c.skin, 0.35);
    const top = mix(c.hair, c.skin, 0.12);
    R(h, 1, -1, 6, 1, top); R(h, 0, 0, 8, 1, top); R(h, 0, 1, 8, 1, st); R(h, 0, 2, 1, 1, st);
    if (h.view === 'back') R(h, 0, 1, 8, 5, st);
    else if (h.s > 1) h.p.line(h.x0 + 2 * h.s, h.y0 + 1, h.x0 + 4 * h.s, h.y0 - h.s + 1, c.skinL);
    else h.p.put(h.x0 + 2, h.y0, c.skinL);
  },
  // 34 longo repartido ao meio (hippie)
  (h, c) => {
    R(h, 1, -1, 6, 1, c.hair); R(h, 0, 0, 8, 2, c.hair);
    R(h, -1, 1, 2, 11, c.hair); R(h, 7, 1, 2, 11, c.hairD); R(h, -1, 12, 1, 1, c.hair); R(h, 8, 12, 1, 1, c.hairD);
    if (h.view === 'front') { R(h, 0, 2, 2, 1, c.hair); R(h, 6, 2, 2, 1, c.hairD); R(h, 4, -1, 1, 2, c.hairD); }
    else R(h, -1, 0, 10, 12, c.hair);
    R(h, 2, -1, 2, 1, c.hairL); R(h, 5, -1, 1, 1, c.hairL);
  },
  // 35 dreads presos no alto
  (h, c) => {
    R(h, 0, -1, 8, 3, c.hair); R(h, 0, 2, 1, 1, c.hair); R(h, 7, 2, 1, 1, c.hairD);
    for (const u of [1, 2, 3, 4, 5, 6]) R(h, u, -5 + (u % 2), 1, 4 - (u % 2), u % 2 ? c.hairD : c.hair);
    R(h, 0, -4, 1, 2, c.hair); R(h, 7, -4, 1, 2, c.hairD);
    R(h, 2, -2, 4, 1, c.accent);
    if (h.view === 'back') R(h, 0, -1, 8, 6, c.hair);
    R(h, 2, -5, 1, 1, c.hairL);
  },
  // 36 victory rolls (anos 40)
  (h, c) => {
    R(h, 0, 0, 8, 2, c.hair); R(h, -1, 1, 1, 5, c.hair); R(h, 8, 1, 1, 5, c.hairD); R(h, -1, 6, 2, 1, c.hairD); R(h, 7, 6, 2, 1, c.hairD);
    for (const u of [2, 6]) h.p.ellipse(h.x0 + u * h.s, h.y0 - 1 * h.s, 2.3 * h.s, 1.7 * h.s, (x, y) => (dith(x, y, 0.2) ? c.hairD : c.hair));
    R(h, 2, -1, 1, 1, c.hairD); R(h, 6, -1, 1, 1, c.hairD); R(h, 1, -2, 1, 1, c.hairL); R(h, 5, -2, 1, 1, c.hairL);
    if (h.view === 'back') R(h, -1, -1, 10, 8, c.hair);
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
  if (ty >= 9) { drawHat27(h, ty); return; }
  if (ty === 1) { R(h, -2, 0, 12, 1, hc); R(h, 0, -6, 8, 6, hc); R(h, 0, -1, 8, 1, mix(hc, C('#c8b070'), 0.5)); R(h, 1, -6, 2, 5, hl); R(h, 7, -6, 1, 6, hd); }
  else if (ty === 2) { R(h, -3, 0, 14, 1, hc); R(h, -3, -1, 1, 1, hc); R(h, 10, -1, 1, 1, hc); R(h, 1, -3, 6, 3, hc); R(h, 3, -3, 2, 1, hd); R(h, 1, -1, 6, 1, hd); R(h, 1, -3, 1, 2, hl); }
  else if (ty === 3) { R(h, -1, -1, 9, 2, hc); R(h, 0, -2, 7, 1, hc); R(h, 3, -3, 1, 1, hd); R(h, 0, -2, 3, 1, hl); }
  else if (ty === 4) { R(h, 0, -3, 8, 1, hc); R(h, -1, -2, 10, 3, hc); R(h, -1, 0, 10, 1, hd); R(h, 1, -3, 2, 1, hl); }
  else if (ty === 5) { R(h, 0, 1, 8, 1, hc); if (h.view === 'back') R(h, 3, 1, 2, 3, hd); else R(h, 8, 1, 1, 3, hd); }
  else if (ty === 6) { R(h, 0, -2, 8, 3, hc); R(h, 1, -2, 3, 1, hl); if (h.view === 'front') R(h, -1, 0, 7, 1, hd); else R(h, 6, 0, 4, 1, hd); }
  else if (ty === 7) { R(h, -2, 0, 12, 1, hc); R(h, 1, -3, 6, 3, hc); R(h, 1, -1, 6, 1, hd); R(h, 3, -3, 2, 1, hd); R(h, 1, -3, 1, 2, hl); }
  else { R(h, 0, -1, 8, 3, hc); R(h, -1, 1, 10, 1, hc); R(h, 2, -1, 3, 1, hl); if (h.view === 'front') { R(h, 8, 1, 2, 2, hd); R(h, 9, 3, 1, 2, hd); } else R(h, 3, 2, 2, 3, hd); }
}

/** Rodada 27: cor padrão dos chapéus novos (índice 9..22). '' = cor da roupa. */
const HAT27_DEF = ['#e4dccb', '#d8692a', '', '#e4dccb', '#6a5a46', '#1c1c20', '#e8d8a8', '#d8c080', '#3a4a2c', '#e4dccb', '#8a6038', '', '#1e1e24', ''];

/** Rodada 27: turbante, gele, boné pra trás, bucket, kangol, coco, panamá, sombrero, quepe, kufi, cangaceiro, cloche, durag, tam. */
function drawHat27(h: HeadCtx, ty: number): void {
  const c = h.col;
  const pal = PALETTES[h.era];
  const def = HAT27_DEF[ty - 9];
  const hc = h.look.hatC !== undefined ? tone(C(OUTFIT_COLORS[h.look.hatC % OUTFIT_COLORS.length]), pal) : def ? tone(C(def), pal) : c.cloth;
  const hd = shade(hc, -0.3);
  const hl = shade(hc, 0.25);
  const gold = tone(C('#e0b840'), pal);
  const front = h.view === 'front';
  switch (ty) {
    case 9: // turbante
      R(h, 0, -4, 8, 1, hc); R(h, -1, -3, 10, 3, hc); R(h, -1, 0, 10, 1, hd); R(h, 1, -3, 3, 1, hl); R(h, 4, -2, 4, 1, hd); R(h, 0, -1, 3, 1, hl);
      if (front) { R(h, 3, -2, 2, 1, c.accent); R(h, 3, -3, 1, 1, shade(c.accent, 0.3)); }
      break;
    case 10: // gele / turbante africano (alto, com dobras e estampa)
      R(h, -1, -1, 10, 2, hc); R(h, -2, -4, 12, 3, hc); R(h, 0, -6, 8, 2, hc); R(h, 6, -7, 3, 2, hl); R(h, -2, -5, 2, 1, hl);
      R(h, -1, -2, 10, 1, hd); R(h, 1, -5, 6, 1, hd);
      for (let y = h.y0 - 6 * h.s; y < h.y0 + h.s; y++) for (let x = h.x0 - 2 * h.s; x < h.x0 + 10 * h.s; x++) if ((x + y * 2) % 5 === 0 && h.p.get(x, y) === hc) h.p.put(x, y, gold);
      break;
    case 11: // boné pra trás
      R(h, 0, -2, 8, 3, hc); R(h, 1, -2, 3, 1, hl);
      if (front) { R(h, 3, 0, 2, 1, hd); R(h, 8, -1, 2, 1, hd); } else R(h, -2, 0, 4, 1, hd);
      break;
    case 12: // bucket
      R(h, 0, -3, 8, 3, hc); R(h, -1, 0, 10, 1, hc); R(h, -2, 1, 1, 1, hc); R(h, 9, 1, 1, 1, hd); R(h, 0, 1, 1, 1, hd); R(h, 1, -3, 2, 1, hl); R(h, 0, -1, 8, 1, hd);
      break;
    case 13: // boina de jornaleiro / kangol
      R(h, 0, -2, 8, 2, hc); R(h, -1, -1, 10, 1, hc); R(h, 1, -2, 3, 1, hl);
      if (front) R(h, -1, 0, 6, 1, hd); else R(h, 1, 0, 8, 1, hd);
      break;
    case 14: // chapéu-coco
      R(h, 1, -4, 6, 1, hc); R(h, 0, -3, 8, 3, hc); R(h, -1, 0, 10, 1, hc); R(h, 0, -1, 8, 1, hd); R(h, 1, -4, 2, 2, hl);
      break;
    case 15: // panamá / palheta
      R(h, 0, -3, 8, 3, hc); R(h, -3, 0, 14, 1, hc); R(h, -3, 0, 1, 1, hd); R(h, 10, 0, 1, 1, hd); R(h, 0, -1, 8, 1, tone(C('#2a2a30'), pal)); R(h, 1, -3, 3, 1, hl);
      break;
    case 16: // sombrero
      R(h, 2, -6, 4, 1, hc); R(h, 1, -5, 6, 5, hc); R(h, -5, 0, 18, 1, hc); R(h, -6, -1, 1, 1, hc); R(h, 13, -1, 1, 1, hd); R(h, 1, -1, 6, 1, gold); R(h, -5, 0, 18, 1, hc); R(h, 2, -5, 2, 2, hl); R(h, 6, -5, 1, 5, hd);
      break;
    case 17: // quepe militar
      R(h, -1, -3, 10, 2, hc); R(h, 0, -1, 8, 1, hd); R(h, 1, -3, 3, 1, hl);
      if (front) { R(h, -1, 0, 6, 1, tone(C('#141418'), pal)); R(h, 3, -2, 2, 1, gold); } else R(h, 0, 0, 8, 1, hd);
      break;
    case 18: // kufi / fila
      R(h, 0, -2, 8, 3, hc); R(h, 1, -2, 2, 1, hl);
      for (let u = 0; u < 8; u += 2) R(h, u, 0, 1, 1, hd);
      break;
    case 19: // cangaceiro (meia-lua de couro com estrelas)
      R(h, -1, -2, 10, 2, hd); R(h, -2, 0, 12, 1, hc); R(h, -2, -1, 1, 1, hc); R(h, 9, -1, 1, 1, hd);
      if (front) { // aba da frente virada para cima: meia-lua com estrelas
        const lim = h.y0 - 0.5 * h.s;
        h.p.ellipse(h.x0 + 4 * h.s, lim, 6 * h.s, 5.5 * h.s, (x, y, d) => (y >= lim ? 0 : d > 0.86 ? hl : hc));
        R(h, 3, -3, 2, 1, gold); R(h, 1, -2, 1, 1, gold); R(h, 6, -2, 1, 1, gold); R(h, 4, -5, 1, 1, shade(gold, 0.3)); R(h, -1, -4, 1, 1, gold); R(h, 8, -4, 1, 1, gold);
      } else R(h, 0, -4, 8, 3, hc);
      break;
    case 20: // cloche
      R(h, 0, -3, 8, 1, hc); R(h, -1, -2, 10, 4, hc); R(h, -1, 0, 10, 1, c.accent); R(h, -1, 2, 2, 1, hd); R(h, 7, 2, 2, 1, hd); R(h, 1, -3, 3, 1, hl);
      if (front) R(h, 7, -1, 2, 1, shade(c.accent, 0.3));
      break;
    case 21: // durag
      R(h, 0, -1, 8, 3, hc); R(h, 1, -1, 3, 1, hl); R(h, 0, 1, 8, 1, hd);
      if (front) R(h, 8, 1, 1, 4, hd); else R(h, 3, 1, 2, 6, hd);
      break;
    default: { // 22 boina rasta (tam) listrada
      const st = [C('#c83030'), C('#e8c030'), C('#2f8a4c'), C('#1e1e24')].map((x) => tone(x, pal));
      R(h, 0, -5, 8, 1, st[3]); R(h, -1, -4, 10, 1, st[0]); R(h, -1, -3, 11, 1, st[1]); R(h, -1, -2, 11, 1, st[2]); R(h, -1, -1, 10, 1, st[0]);
      if (front) R(h, 9, -2, 1, 3, st[2]); else R(h, 2, 0, 4, 2, st[1]);
      break;
    }
  }
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

/** Rodada 27: brincos e tatuagem no rosto. */
function drawHead27(h: HeadCtx): void {
  if (h.view !== 'front') return;
  const { p, s, col } = h;
  const X = (u: number) => h.x0 + u * s;
  const Y = (v: number) => h.y0 + v * s;
  const ear = h.look.ear ?? 0;
  if (ear) {
    const m = C(ear === 3 ? '#d0d4dc' : ear === 2 ? '#f4f4ff' : '#e8c040');
    const md = shade(m, -0.3);
    for (const ex of [X(0), X(8) - 1]) {
      if (s === 1) { p.put(ex, Y(5), m); continue; }
      if (ear === 2) p.put(ex, Y(5), m);
      else if (ear === 4) { p.put(ex, Y(5), m); p.put(ex, Y(5) + 1, md); p.put(ex, Y(5) + 2, m); p.put(ex, Y(5) + 3, shade(m, 0.3)); }
      else { p.put(ex, Y(5), m); p.put(ex - 1, Y(5) + 1, md); p.put(ex + 1, Y(5) + 1, m); p.put(ex, Y(5) + 2, md); }
    }
  }
  if (h.look.tat === 3) { // lágrima e marcas no rosto
    const ink = mix(col.skinD, C('#1a2a4a'), 0.65);
    if (s === 1) p.put(X(2), Y(5), ink);
    else { p.put(X(3) - 1, Y(5) + 1, ink); p.put(X(3) - 1, Y(5) + 2, ink); p.put(X(6) + 1, Y(2), ink); p.put(X(6) + 2, Y(2) + 1, ink); p.put(X(6), Y(2) + 1, ink); }
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
  if (h.look.ear || h.look.tat === 3) drawHead27(h);
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
  /** rodada 27: ano (instrumentos com data) */
  year?: number;
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

function arm(p: Px, sh: Pt, hand: Pt, sleeve: Col, skin: Col, sleeveFrac: number, side: -1 | 1, ink?: Col): void {
  const dx = hand.x - sh.x;
  const dy = hand.y - sh.y;
  const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(sh.x + (dx * i) / n);
    const y = Math.round(sh.y + (dy * i) / n);
    const bare = i / n > sleeveFrac;
    const c = bare ? skin : sleeve;
    p.put(x, y, ink !== undefined && bare && i < n && i % 2 === 0 ? ink : c); // rodada 27: tatuagem no braço
    p.put(x + side, y, i / n <= sleeveFrac ? shade(sleeve, side > 0 ? -0.15 : 0.08) : shade(skin, side > 0 ? -0.12 : 0));
  }
  p.put(hand.x, hand.y, skin);
  p.put(hand.x + side, hand.y, skin);
  p.put(hand.x, hand.y + 1, shade(skin, -0.12));
  p.put(hand.x + side, hand.y + 1, shade(skin, -0.12));
}

// ---------- rodada 27: roupas, colares e instrumentos novos do boneco ----------

interface O27 { col: Colors; pal: Palette; look: Appearance; front: boolean; tx0: number; tw: number; ty0: number; ty1: number; hip: number; torso: (c: Col) => void }
interface R27 { sleeve: Col; frac: number; collar?: () => void }

/** Saia/túnica comprida até o tornozelo (cobre a perna). */
function skirt27(p: Px, k: O27, c: Col, cd: Col, flare: number, top = k.ty1): number {
  const hem = GROUND - 3;
  for (let y = top; y <= hem; y++) {
    const fl = Math.floor(((y - top) * flare) / 4);
    p.hline(k.tx0 - fl, k.tx0 + k.tw - 1 + fl, y, y === hem ? cd : c);
    p.put(k.tx0 + k.tw - 1 + fl, y, cd);
  }
  return hem;
}

function outfit27(p: Px, n: number, k: O27): R27 {
  const { col, front, tx0, tw, ty0, ty1, torso, pal } = k;
  const gold = tone(C('#e0b840'), pal);
  const white = tone(C('#f2f0ea'), pal);
  const each = (fn: (x: number, y: number) => void) => { for (let y = ty0 + 1; y <= ty1; y++) for (let x = tx0; x < tx0 + tw; x++) fn(x, y); };
  const vee = (c: Col, rows = 4) => { for (let y = ty0; y <= ty0 + rows; y++) { const wv = Math.max(0, 2 - Math.floor((y - ty0) / 2)); if (wv) p.hline(CX - wv, CX + wv - 1, y, c); } };
  switch (n) {
    case 4: { // jaqueta de couro
      torso(col.cloth);
      if (front) { p.vline(CX - 1, ty0, ty1 - 1, col.shirt); p.vline(CX, ty0, ty0 + 2, shade(col.shirt, -0.1)); p.put(CX - 2, ty0, col.clothL); p.put(CX + 1, ty0, col.clothL); p.put(CX - 2, ty0 + 1, col.clothL); p.vline(CX + 1, ty0 + 3, ty1 - 1, tone(C('#c8ccd8'), pal)); p.vline(tx0, ty0 + 1, ty1 - 2, col.clothL); }
      return { sleeve: col.cloth, frac: 0.88 };
    }
    case 5: { // jaqueta jeans
      torso(col.cloth);
      if (front) { p.put(CX - 1, ty0, col.shirt); p.put(CX - 2, ty0, col.clothL); p.put(CX + 1, ty0, col.clothL); p.vline(CX - 1, ty0 + 1, ty1, col.clothD); p.put(tx0 + 1, ty0 + 2, col.clothL); p.put(tx0 + tw - 2, ty0 + 2, col.clothL); p.hline(tx0, tx0 + tw - 1, ty1, col.clothD); }
      return { sleeve: col.cloth, frac: 0.85 };
    }
    case 6: { // camisa aberta no peito
      torso(col.cloth);
      if (front) { p.hline(CX - 2, CX + 1, ty0, col.skin); p.hline(CX - 1, CX, ty0 + 1, col.skin); p.hline(CX - 1, CX, ty0 + 2, col.skinD); p.put(CX - 1, ty0 + 3, col.skinD); p.put(CX - 3, ty0, col.clothL); p.put(CX + 2, ty0, col.clothL); }
      return { sleeve: col.cloth, frac: 0.55 };
    }
    case 7: { // regata
      torso(col.cloth);
      p.put(tx0, ty0, col.skin); p.put(tx0 + tw - 1, ty0, col.skinD);
      if (front) { p.hline(CX - 1, CX, ty0, col.skin); p.put(CX - 1, ty0 + 1, col.skinD); }
      return { sleeve: col.skin, frac: 0 };
    }
    case 8: { // smoking com gravata-borboleta
      torso(col.cloth);
      if (front) {
        vee(col.shirt);
        p.vline(CX - 1, ty0, ty1 - 1, col.shirt);
        const bk = tone(C('#141418'), pal);
        p.put(CX - 2, ty0, bk); p.put(CX + 1, ty0, bk); p.hline(CX - 1, CX, ty0, shade(bk, 0.2));
        p.put(CX - 2, ty0 + 1, col.clothL); p.put(CX + 1, ty0 + 1, col.clothL); p.put(CX - 1, ty0 + 3, bk);
      }
      return { sleeve: col.cloth, frac: 0.88 };
    }
    case 9: { // túnica / kaftan / dashiki estampado (até o tornozelo)
      torso(col.cloth);
      skirt27(p, k, col.cloth, col.clothD, 2);
      const pr = mix(col.cloth, gold, 0.65);
      for (let y = ty0 + 2; y <= GROUND - 4; y++) for (let x = tx0 - 4; x < tx0 + tw + 4; x++) if (((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) && p.get(x, y) === col.cloth && (x + y * 3) % 2 === 0) p.put(x, y, y % 4 < 2 ? pr : col.clothD);
      if (front) { p.put(CX - 2, ty0, gold); p.put(CX + 1, ty0, gold); p.hline(CX - 1, CX, ty0 + 1, gold); p.vline(CX - 1, ty0 + 2, ty0 + 4, gold); p.hline(CX - 1, CX, ty0, col.skin); }
      return { sleeve: col.cloth, frac: 0.92 };
    }
    case 10: { // lantejoulas
      torso(col.cloth);
      if (k.look.sx !== 'm') for (let y = ty1; y <= k.hip + 2; y++) { const fl = Math.floor((y - ty1) / 2); p.hline(tx0 - fl, tx0 + tw - 1 + fl, y, col.cloth); }
      for (let y = ty0; y <= k.hip + 2; y++) for (let x = tx0 - 2; x < tx0 + tw + 2; x++) if (p.get(x, y) === col.cloth && (x * 7 + y * 3) % 5 === 0) p.put(x, y, (x + y) % 3 ? col.clothL : white);
      if (front && k.look.sx !== 'm') p.hline(CX - 1, CX, ty0, col.skin);
      return { sleeve: col.cloth, frac: k.look.sx === 'm' ? 0.88 : 0.15 };
    }
    case 11: { // casaco militar com alamares
      torso(col.cloth);
      p.put(tx0 - 1, ty0, gold); p.put(tx0 + tw, ty0, gold);
      if (front) { for (let y = ty0 + 2; y < ty1; y += 2) p.hline(CX - 2, CX + 1, y, gold); p.hline(CX - 1, CX, ty0, col.clothD); p.vline(CX - 1, ty0 + 1, ty1, col.clothD); }
      return { sleeve: col.cloth, frac: 0.92 };
    }
    case 12: { // agasalho esportivo
      torso(col.cloth);
      p.vline(tx0, ty0 + 1, ty1, white); p.vline(tx0 + tw - 1, ty0 + 1, ty1, shade(white, -0.15));
      if (front) { p.vline(CX - 1, ty0, ty1, tone(C('#d8d8de'), pal)); p.hline(CX - 2, CX + 1, ty0, col.clothD); }
      return { sleeve: col.cloth, frac: 0.92 };
    }
    case 13: { // moletom com capuz
      torso(col.cloth);
      if (front) { p.hline(CX - 3, CX + 2, ty0, col.clothD); p.put(CX - 3, ty0 + 1, col.clothD); p.put(CX + 2, ty0 + 1, col.clothD); p.vline(CX - 2, ty0 + 1, ty0 + 3, col.shirt); p.vline(CX + 1, ty0 + 1, ty0 + 2, col.shirt); p.rect(CX - 2, ty1 - 3, 4, 2, col.clothD); }
      else p.rect(CX - 3, ty0 - 1, 6, 3, col.clothD);
      return { sleeve: col.cloth, frac: 0.92 };
    }
    case 14: { // top cropped (barriga de fora)
      torso(col.skin);
      p.rect(tx0, ty0, tw, 4, col.cloth); p.vline(tx0 + tw - 1, ty0 + 1, ty0 + 3, col.clothD); p.hline(tx0, tx0 + tw - 1, ty0 + 3, col.clothD);
      p.vline(tx0 + tw - 1, ty0 + 4, ty1 - 1, col.skinD);
      if (front) { p.hline(CX - 1, CX, ty0, col.skin); p.put(CX - 1, ty1 - 2, col.skinD); }
      p.hline(tx0, tx0 + tw - 1, ty1, col.pants);
      return { sleeve: col.cloth, frac: 0.15 };
    }
    case 15: { // camisa xadrez de flanela
      torso(col.cloth);
      const dk = mix(col.cloth, C('#101014'), 0.4);
      each((x, y) => { if (x % 3 === 0 && y % 3 === 0) p.put(x, y, shade(dk, -0.2)); else if (x % 3 === 0 || y % 3 === 0) p.put(x, y, dk); });
      if (front) { p.put(CX - 1, ty0, col.shirt); p.put(CX - 2, ty0, col.clothL); p.put(CX + 1, ty0, col.clothL); }
      return { sleeve: col.cloth, frac: 0.8 };
    }
    case 16: { // macacão com gola alta e cinto
      torso(col.cloth);
      if (front) { p.put(CX - 3, ty0, white); p.put(CX + 2, ty0, white); p.put(CX - 3, ty0 + 1, white); p.put(CX + 2, ty0 + 1, shade(white, -0.15)); p.hline(CX - 1, CX, ty0, col.skin); p.put(CX - 1, ty0 + 1, col.skinD); p.put(tx0 + 1, ty0 + 2, gold); p.put(tx0 + tw - 2, ty0 + 2, gold); p.put(CX - 1, ty0 + 4, gold); }
      p.hline(tx0, tx0 + tw - 1, ty1 - 1, gold);
      return { sleeve: col.cloth, frac: 0.92 };
    }
    case 17: { // jaqueta de franjas
      torso(col.cloth);
      if (front) vee(col.shirt, 3);
      p.hline(tx0, tx0 + tw - 1, ty0 + 3, col.clothD);
      for (let x = tx0 - 1; x <= tx0 + tw; x += 2) { p.put(x, ty0 + 4, col.clothD); p.put(x, ty1 + 1, col.clothD); }
      p.put(tx0 - 1, ty0 + 5, col.clothD); p.put(tx0 + tw, ty0 + 5, col.clothD);
      return { sleeve: col.cloth, frac: 0.85 };
    }
    case 18: { // qipao (gola mandarim, fenda)
      torso(col.cloth);
      skirt27(p, k, col.cloth, col.clothD, 0);
      p.vline(tx0 + 1, k.hip + 3, GROUND - 3, col.skin);
      for (let y = ty0 + 2; y < GROUND - 4; y += 3) p.put(tx0 + 1 + ((y >> 1) % (tw - 1)), y, col.clothL);
      if (front) { p.put(CX, ty0 + 1, gold); p.put(CX + 1, ty0 + 2, gold); p.put(tx0 + tw - 2, ty0 + 3, gold); }
      return { sleeve: col.cloth, frac: 0.2, collar: () => { p.hline(CX - 1, CX, ty0 - 1, col.cloth); } };
    }
    case 19: { // sári
      torso(col.cloth);
      skirt27(p, k, col.cloth, col.clothD, 1, ty1 - 1);
      if (front) { p.hline(tx0 + 1, tx0 + tw - 1, ty0 + 4, col.skin); p.put(tx0 + tw - 1, ty0 + 5, col.skinD); }
      for (let y = ty1 + 1; y < GROUND - 3; y++) if (y % 2) p.put(CX - 1 + ((y >> 1) % 2), y, col.clothD);
      const sash = mix(col.cloth, gold, 0.35);
      p.line(tx0, ty0, tx0 + tw - 1, ty1, sash); p.line(tx0 + 1, ty0, tx0 + tw - 1, ty1 - 1, sash); p.line(tx0 - 1, ty0 + 1, tx0 + tw - 2, ty1, gold);
      return { sleeve: col.cloth, frac: 0.3 };
    }
    case 20: { // quimono com obi
      torso(col.cloth);
      skirt27(p, k, col.cloth, col.clothD, 0);
      p.rect(tx0, ty1 - 2, tw, 3, col.accent); p.hline(tx0, tx0 + tw - 1, ty1 - 2, shade(col.accent, 0.25));
      if (front) { p.put(CX - 2, ty0, col.shirt); p.put(CX - 1, ty0 + 1, col.shirt); p.put(CX, ty0 + 2, col.shirt); p.put(CX + 1, ty0, col.shirt); p.put(CX, ty0 + 1, shade(col.shirt, -0.1)); }
      for (let y = ty1 + 2; y < GROUND - 4; y += 3) p.put(tx0 + 1 + (y % (tw - 1)), y, col.clothL);
      return { sleeve: col.cloth, frac: 1 };
    }
    case 21: { // gola alta
      torso(col.cloth);
      if (front) p.hline(CX - 2, CX + 1, ty0, col.clothD);
      return { sleeve: col.cloth, frac: 0.92, collar: () => { p.hline(CX - 1, CX, ty0 - 1, col.cloth); } };
    }
    case 22: { // colete sobre camisa
      torso(col.shirt);
      p.rect(tx0, ty0 + 1, tw, ty1 - ty0, col.cloth); p.vline(tx0 + tw - 1, ty0 + 1, ty1, col.clothD);
      if (front) { vee(col.shirt, 3); p.vline(CX - 1, ty0 + 1, ty0 + 3, col.accent); p.put(CX - 1, ty0 + 5, col.clothD); p.put(CX - 1, ty1 - 1, col.clothD); }
      return { sleeve: col.shirt, frac: 0.8 };
    }
    case 23: { // poncho listrado
      torso(col.cloth);
      for (let y = ty0 + 1; y <= ty1 + 1; y++) { const wv = Math.min(3, Math.floor((y - ty0) / 2)); p.hline(tx0 - wv, tx0 + tw - 1 + wv, y, col.cloth); }
      p.hline(tx0 - 1, tx0 + tw, ty0 + 3, col.accent); p.hline(tx0 - 3, tx0 + tw + 2, ty1, white); p.hline(tx0 - 3, tx0 + tw + 2, ty1 + 1, col.clothD);
      if (front) p.put(CX - 1, ty0, col.clothD);
      return { sleeve: col.cloth, frac: 1 };
    }
    case 24: { // camisa florida
      torso(col.cloth);
      const yel = tone(C('#f0d040'), pal);
      each((x, y) => { if ((x * 3 + y * 5) % 7 === 0) p.put(x, y, white); else if ((x * 5 + y) % 9 === 0) p.put(x, y, yel); });
      if (front) { p.hline(CX - 1, CX, ty0, col.skin); p.put(CX - 2, ty0, col.clothL); p.put(CX + 1, ty0, col.clothL); }
      return { sleeve: col.cloth, frac: 0.4 };
    }
    // ---- rodada 29 (looks29.ts): roupas por época e região ----
    case 26: { // terno zoot: paletó comprido, corrente
      torso(col.cloth);
      p.rect(tx0, ty1, tw, 3, col.cloth); p.vline(tx0 + tw - 1, ty1, ty1 + 2, col.clothD);
      if (front) { vee(col.shirt, 3); p.vline(CX - 1, ty0 + 1, ty0 + 4, col.accent); p.line(CX, ty1, tx0 + tw - 1, ty1 + 3, gold); }
      return { sleeve: col.cloth, frac: 0.95 };
    }
    case 27: { // guayabera: pregas verticais e bolsos
      torso(col.cloth);
      for (const x of [tx0 + 1, tx0 + tw - 2]) for (let y = ty0 + 2; y <= ty1; y++) if (y % 2) p.put(x, y, col.clothD);
      if (front) { p.hline(CX - 1, CX, ty0, col.skin); p.put(CX - 2, ty0, col.clothL); p.put(CX + 1, ty0, col.clothL); p.put(tx0 + 1, ty1 - 2, col.clothL); p.put(tx0 + tw - 2, ty1 - 2, col.clothL); }
      return { sleeve: col.cloth, frac: 0.4 };
    }
    case 28: { // agbada / bubu: túnica larga até o tornozelo, bordado no peito
      torso(col.cloth);
      for (let y = ty0 + 1; y <= ty1; y++) { const wv = Math.min(3, Math.floor((y - ty0) / 2)); p.hline(tx0 - wv, tx0 + tw - 1 + wv, y, col.cloth); p.put(tx0 + tw - 1 + wv, y, col.clothD); }
      skirt27(p, k, col.cloth, col.clothD, 1);
      if (front) { p.hline(CX - 2, CX + 1, ty0 + 1, gold); p.vline(CX - 1, ty0 + 2, ty0 + 5, gold); p.put(CX - 2, ty0 + 3, gold); p.put(CX + 1, ty0 + 3, gold); p.hline(CX - 1, CX, ty0, col.skin); }
      return { sleeve: col.cloth, frac: 1 };
    }
    case 29: { // hanbok: jaqueta curta (jeogori) com laço e saia alta e rodada
      torso(col.shirt);
      skirt27(p, k, col.cloth, col.clothD, 2, ty0 + 4);
      if (front) { p.line(CX - 2, ty0, CX, ty0 + 2, white); p.line(CX + 1, ty0, CX - 1, ty0 + 2, white); p.vline(CX, ty0 + 3, ty0 + 6, col.accent); p.put(CX + 1, ty0 + 3, col.accent); }
      return { sleeve: col.shirt, frac: 0.95 };
    }
    case 30: { // jaqueta college: corpo de uma cor, mangas brancas, letra no peito
      torso(col.cloth);
      p.hline(tx0, tx0 + tw - 1, ty1, white);
      if (front) { p.vline(CX - 1, ty0, ty1 - 1, col.clothD); p.rect(tx0 + 1, ty0 + 2, 2, 2, white); p.put(tx0 + 1, ty0 + 2, col.accent); p.hline(CX - 2, CX + 1, ty0, white); }
      return { sleeve: white, frac: 0.92 };
    }
    case 31: { // terninho de ombreiras
      torso(col.cloth);
      p.hline(tx0 - 1, tx0 + tw, ty0, col.clothL); p.put(tx0 - 1, ty0 + 1, col.cloth); p.put(tx0 + tw, ty0 + 1, col.clothD);
      if (front) { vee(col.shirt, 3); p.put(CX - 2, ty0 + 3, col.clothL); p.put(CX + 1, ty0 + 3, col.clothL); p.put(CX - 1, ty0 + 5, gold); }
      return { sleeve: col.cloth, frac: 0.92 };
    }
    case 32: { // colete de patches sobre camiseta
      torso(col.shirt);
      p.rect(tx0, ty0 + 1, tw, ty1 - ty0, col.cloth); p.vline(tx0 + tw - 1, ty0 + 1, ty1, col.clothD);
      const pc = [tone(C('#e04848'), pal), white, tone(C('#f0c040'), pal), tone(C('#48b85c'), pal)];
      each((x, y) => { if (p.get(x, y) === col.cloth && (x * 5 + y * 3) % 7 === 0) p.put(x, y, pc[(x + y) % 4]); });
      if (front) { p.vline(CX - 1, ty0 + 1, ty1, col.shirt); p.vline(CX, ty0 + 1, ty1, col.shirt); }
      return { sleeve: col.shirt, frac: 0.35 };
    }
    case 33: { // camisa de futebol: listras verticais e gola em V
      torso(col.cloth);
      each((x, y) => { if ((x - tx0) % 3 === 1) p.put(x, y, col.accent); });
      if (front) { p.put(CX - 1, ty0, white); p.put(CX, ty0, white); p.put(CX - 1, ty0 + 1, col.skin); }
      return { sleeve: col.cloth, frac: 0.35 };
    }
    default: { // 25 camiseta estampada
      torso(col.cloth);
      if (front) {
        p.put(CX - 1, ty0, col.skin); p.put(CX, ty0, col.skinD);
        p.rect(CX - 2, ty0 + 2, 3, 3, printOn(col.cloth, pal)); p.put(CX - 1, ty0 + 3, col.accent);
      }
      return { sleeve: col.cloth, frac: 0.35 };
    }
  }
}

/** Estampa clara em roupa escura e vice-versa. */
function printOn(c: Col, pal: Palette): Col {
  const lum = (c & 255) + ((c >>> 8) & 255) + ((c >>> 16) & 255);
  return tone(C(lum > 420 ? '#1e1e24' : '#f2f0ea'), pal);
}

/** Colares e afins no peito do boneco. */
function neck27(p: Px, nk: number, col: Colors, pal: Palette, tx0: number, tw: number, ty0: number, ty1: number): void {
  const gold = tone(C('#e8c040'), pal);
  const c = nk === 3 ? tone(C('#f2eee4'), pal) : nk === 5 ? tone(C('#c8ccd8'), pal) : gold;
  switch (nk) {
    case 1: case 3: case 5:
      p.put(CX - 2, ty0, c); p.hline(CX - 1, CX, ty0 + 1, c); p.put(CX + 1, ty0, shade(c, -0.2));
      if (nk === 5) { p.put(CX - 1, ty0 + 2, gold); p.put(CX - 1, ty0 + 3, gold); }
      break;
    case 2: p.put(CX - 3, ty0, gold); p.put(CX + 2, ty0, gold); p.hline(CX - 2, CX + 1, ty0 + 1, gold); p.hline(CX - 1, CX, ty0 + 2, shade(gold, 0.3)); p.hline(CX - 1, CX, ty0 + 3, shade(gold, -0.2)); break;
    case 4: { const bc = BEADS27.map((x) => tone(C(x), pal)); p.put(CX - 2, ty0, bc[0]); p.put(CX - 2, ty0 + 1, bc[1]); p.put(CX - 1, ty0 + 2, bc[2]); p.put(CX, ty0 + 2, bc[3]); p.put(CX + 1, ty0 + 1, bc[0]); p.put(CX + 1, ty0, bc[1]); break; }
    case 6: p.hline(CX - 2, CX + 1, ty0, col.accent); p.put(CX - 2, ty0 + 1, col.accent); p.put(CX - 2, ty0 + 2, shade(col.accent, -0.2)); break;
    case 7: p.hline(CX - 1, CX, ty0 - 1, tone(C('#1a1a20'), pal)); break;
    case 8: {
      const pk = tone(C('#ff7ac0'), pal);
      p.hline(tx0 - 1, tx0 + tw, ty0, pk); p.vline(tx0 - 1, ty0, ty1 - 1, pk); p.vline(tx0 + tw, ty0, ty1 - 2, shade(pk, -0.2));
      for (let y = ty0 + 1; y < ty1; y += 2) { p.put(tx0 - 2, y, shade(pk, 0.2)); p.put(tx0 + tw + 1, y, pk); }
      break;
    }
    case 9: { const bk = tone(C('#141418'), pal); p.put(CX - 2, ty0, bk); p.put(CX + 1, ty0, bk); p.hline(CX - 1, CX, ty0, shade(bk, 0.25)); break; }
    case 10: p.put(CX - 2, ty0, col.clothD); p.put(CX + 1, ty0, col.clothD); p.hline(CX - 1, CX, ty0 + 2, tone(C('#d0d4dc'), pal)); p.hline(CX - 1, CX, ty0 + 3, tone(C('#a8acb8'), pal)); break;
  }
}
const BEADS27 = ['#d83a2a', '#e8c030', '#2f8a4c', '#3a7ad0'];

interface I27 { col: Colors; pal: Palette; e: EraId; role: string; alt: number; ty0: number; hy0: number; hx0: number; shL: Pt; shR: Pt; extras: (() => void)[]; seed: string }

/** Instrumento preferido (rodada 27): desenha e devolve onde ficam as mãos. */
function inst27(p: Px, n: number, k: I27): { hL: Pt; hR: Pt } {
  const { ty0, hy0, hx0, alt, extras, shL, shR, pal } = k;
  const t = (hex: string) => tone(C(hex), pal);
  const by = ty0 + 7;
  const wood = t('#c88a48'), woodL = t('#e6b878'), woodD = t('#7a4a22'), hole = t('#2a1a10');
  const neck = (nx: number, ny: number) => { p.line(CX - 1, by - 1, nx, ny, t('#4a2a14')); p.line(CX - 1, by, nx, ny + 1, t('#6a4a24')); p.rect(nx, ny - 1, 2, 2, t('#2a1a10')); };
  const stand = () => { const sx = CX + 6; p.vline(sx, hy0 + 7, GROUND - 1, C('#4a4a50')); p.hline(sx - 2, sx + 2, GROUND, C('#3a3a40')); p.line(sx, hy0 + 7, CX + 3, hy0 + 6, C('#4a4a50')); p.rect(CX + 2, hy0 + 5, 2, 2, k.e === '1920' || k.e === '1950' ? C('#c9c2a8') : C('#7a7a80')); };
  const strum = (nx: number, ny: number) => ({ hL: { x: CX - 2, y: by + (alt ? 1 : -1) }, hR: { x: nx - 2, y: ny + 2 } });
  const v = h27(k.seed, 3);
  switch (n) {
    case 1: case 9: case 11: { // violão · cavaquinho · ukulele
      const r = n === 1 ? 3.6 : n === 9 ? 2.5 : 2.1;
      const nx = CX + (n === 1 ? 7 : 5), ny = ty0 + (n === 1 ? 1 : 3);
      if (k.role === 'vocal') extras.push(stand);
      extras.push(() => {
        neck(nx, ny);
        p.disc(CX - 2.5, by + 1.5, r, wood); p.disc(CX - 0.5, by - 0.5, r * 0.7, wood);
        p.disc(CX - 2.5, by + 1.5, r - 1, woodL); p.disc(CX - 0.6, by - 0.4, r * 0.7 - 1, woodL);
        p.put(CX - 2, by + 1, hole);
        if (n === 1) { p.put(CX - 1, by, hole); p.put(CX - 2, by, hole); p.hline(CX - 5, CX - 4, by + 3, woodD); }
      });
      return strum(nx, ny);
    }
    case 2: case 3: case 4: case 6: case 7: { // guitarras elétricas
      const body = n === 2 ? t(['#e0a030', '#1e1c22', '#efe2b8'][v]) : n === 3 ? t(['#efe8d8', '#c8282c', '#2a5ad0'][v]) : n === 4 || n === 7 ? t('#a01e1e') : t(['#9a2418', '#d89038', '#2a2a30'][v]);
      const r = n === 6 ? 3.8 : n === 7 ? 3.5 : 3.2;
      const nx = CX + 7, ny = ty0 + 1;
      extras.push(() => {
        if (n === 7) { p.line(CX - 1, by - 3, nx, ny - 2, t('#4a2a14')); p.rect(nx, ny - 3, 2, 2, t('#2a1a10')); }
        neck(nx, ny);
        p.disc(CX - 2.5, by + 1.5, r, body); p.disc(CX - 0.5, by - 0.5, r * 0.68, body);
        if (n === 2) { p.disc(CX - 2.5, by + 1.5, r - 1.3, v === 0 ? t('#f0c050') : shade(body, 0.2)); p.put(CX - 1, by + 1, t('#f0e0b0')); p.put(CX + 1, by - 2, body); }
        if (n === 3) { p.put(CX, by - 3, body); p.put(CX + 1, by - 3, body); p.put(CX - 3, by - 1, body); p.hline(CX - 3, CX - 1, by + 2, v === 0 ? t('#3a2a20') : t('#f4f0e6')); }
        if (n === 4 || n === 7) { p.put(CX + 1, by - 2, body); p.put(CX + 1, by - 3, shade(body, 0.2)); p.put(CX - 4, by - 1, body); p.put(CX - 4, by - 2, shade(body, 0.2)); p.put(CX - 2, by + 2, t('#141414')); }
        if (n === 6) { p.vline(CX - 4, by, by + 2, hole); p.vline(CX, by - 1, by + 1, hole); }
        p.hline(CX - 3, CX - 1, by + 1, t('#e0e0e0'));
        p.put(CX - 3, by, shade(body, 0.3));
      });
      return strum(nx, ny);
    }
    case 5: { // Flying V
      const body = t(['#efe8d8', '#1e1c22', '#c8282c'][v]);
      const nx = CX + 7, ny = ty0 + 1;
      extras.push(() => {
        neck(nx, ny);
        p.line(CX, by - 1, CX - 7, by + 1, body); p.line(CX, by, CX - 7, by + 2, body); p.line(CX, by, CX - 6, by + 3, shade(body, -0.15));
        p.line(CX, by, CX - 3, by + 6, body); p.line(CX - 1, by, CX - 4, by + 6, body); p.line(CX + 1, by, CX - 2, by + 6, shade(body, -0.2));
        p.hline(CX - 3, CX - 1, by + 1, t('#e0e0e0'));
      });
      return strum(nx, ny);
    }
    case 8: { // banjo
      const nx = CX + 8, ny = ty0;
      extras.push(() => { neck(nx, ny); p.disc(CX - 2.5, by + 1.5, 3.3, t('#b8bcc4')); p.disc(CX - 2.5, by + 1.5, 2.5, t('#f2ecdc')); p.put(CX - 3, by + 1, t('#8a8a90')); p.hline(CX - 4, CX - 2, by + 3, t('#5a3a1a')); });
      return strum(nx, ny);
    }
    case 10: { // cítara
      const g = t('#b06a2a');
      extras.push(() => {
        p.line(CX - 3, by + 2, CX + 7, hy0 + 1, t('#6a3a1a')); p.line(CX - 2, by + 2, CX + 8, hy0 + 1, t('#8a5a2a'));
        p.disc(CX + 8, hy0, 1.4, g);
        p.disc(CX - 4, by + 3, 3.4, g); p.disc(CX - 4, by + 3, 2.2, shade(g, 0.2)); p.put(CX - 5, by + 2, t('#f0e0b0'));
        for (let i = 1; i < 6; i++) p.put(CX - 2 + i * 2, by + 1 - Math.round(i * 1.6), t('#e0c890'));
      });
      return { hL: { x: CX - 1, y: by + 1 + alt }, hR: { x: CX + 3, y: ty0 } };
    }
    case 12: { // baixo violino
      const sb = t('#8a3a14'), sbL = t('#d08a3a');
      const nx = CX + 9, ny = ty0 - 1;
      extras.push(() => { neck(nx, ny); p.disc(CX - 2.5, by + 2, 2.6, sb); p.disc(CX - 0.8, by - 0.6, 2, sb); p.disc(CX - 2.5, by + 2, 1.5, sbL); p.disc(CX - 0.8, by - 0.6, 1, sbL); p.hline(CX - 3, CX - 1, by + 1, t('#e0e0e0')); });
      return { hL: { x: CX - 2, y: by + (alt ? 1 : -1) }, hR: { x: CX + 6, y: ty0 + 1 } };
    }
    case 13: case 21: { // contrabaixo · violoncelo
      const big = n === 13;
      extras.push(() => {
        p.vline(CX - 6, hy0 + (big ? 2 : 6), GROUND, t('#3a2010'));
        p.ellipse(CX - 6, ty0 + 9, big ? 4 : 3.2, big ? 4.5 : 3.6, t('#8a3a14'));
        p.ellipse(CX - 6, ty0 + (big ? 4 : 5), big ? 3 : 2.4, big ? 2.5 : 2, t('#8a3a14'));
        p.put(CX - 7, ty0 + 7, t('#c06a2a'));
        p.vline(CX - 6, ty0 + 2, ty0 + 12, t('#2a1a10'));
        if (!big) p.line(CX - 11, ty0 + 8 + alt, CX - 1, ty0 + 9 - alt, t('#d8c8a0'));
      });
      return { hL: { x: CX - 6, y: ty0 + (big ? 1 : 3) }, hR: big ? { x: CX - 3, y: ty0 + 8 + alt } : { x: CX - 1, y: ty0 + 9 - alt } };
    }
    case 14: { // sanfona / acordeão
      const red = t(['#b02020', '#1e1e24', '#2a6ad0'][v]);
      extras.push(() => {
        const w = 7 + alt;
        p.rect(CX - 4, ty0 + 2, w, 6, red);
        for (let x = CX - 1; x < CX - 4 + w - 1; x += 2) p.vline(x, ty0 + 2, ty0 + 7, shade(red, -0.35));
        p.vline(CX - 4, ty0 + 2, ty0 + 7, t('#f4f0e6')); p.vline(CX - 3, ty0 + 2, ty0 + 7, t('#1a1a1a'));
        p.hline(CX - 4, CX - 4 + w - 1, ty0 + 2, shade(red, 0.3)); p.put(CX - 4 + w - 1, ty0 + 4, t('#e8c040'));
      });
      return { hL: { x: CX - 5, y: ty0 + 4 }, hR: { x: CX + 3 + alt, y: ty0 + 4 } };
    }
    case 15: { // keytar
      const kc = t(['#c02a3a', '#efe8d8', '#1e1e24'][v]);
      extras.push(() => { p.line(CX - 6, ty0 + 8, CX + 4, ty0 + 3, kc); p.line(CX - 6, ty0 + 9, CX + 4, ty0 + 4, shade(kc, -0.25)); p.line(CX - 5, ty0 + 7, CX + 1, ty0 + 4, t('#f4f0e6')); p.line(CX + 4, ty0 + 3, CX + 8, ty0 + 1, t('#2a2a30')); });
      return { hL: { x: CX - 3 + alt, y: ty0 + 6 }, hR: { x: CX + 6, y: ty0 + 1 } };
    }
    case 16: { // gaita (cantor)
      extras.push(() => { p.hline(CX - 1, CX + 1, hy0 + 6, t('#c8ccd6')); p.put(CX, hy0 + 6, t('#6a6a74')); });
      return { hL: { x: CX - 3, y: hy0 + 7 }, hR: { x: CX + 2, y: hy0 + 7 + alt } };
    }
    case 17: case 22: { // pandeiro · maracas (com o microfone no pedestal)
      extras.push(stand);
      if (n === 17) {
        const hL = { x: shL.x - 3, y: ty0 - 1 - alt };
        extras.push(() => { p.disc(hL.x - 1, hL.y - 1, 2.4, t('#8a5a2a')); p.disc(hL.x - 1, hL.y - 1, 1.6, t('#f0e6d0')); p.put(hL.x - 3, hL.y - 1, t('#d8d8d8')); p.put(hL.x + 1, hL.y - 1, t('#d8d8d8')); p.put(hL.x - 1, hL.y - 3, t('#d8d8d8')); });
        return { hL, hR: { x: shL.x - 1 + alt, y: ty0 + 1 } };
      }
      const hL = { x: shL.x - 2, y: ty0 - 1 + alt * 2 }, hR = { x: shR.x + 2, y: ty0 + 1 - alt * 2 };
      extras.push(() => { for (const [hh, c] of [[hL, t('#d8402a')], [hR, t('#e8c030')]] as [Pt, Col][]) { p.disc(hh.x, hh.y - 2, 1.4, c); p.put(hh.x - 1, hh.y - 3, shade(c, 0.4)); } });
      return { hL, hR };
    }
    case 18: { // trombone
      const gold = t('#e8b830');
      const sl = CX + 6 + alt * 2;
      extras.push(() => { p.hline(CX + 2, CX + 8, hy0 + 6, gold); p.rect(CX + 8, hy0 + 4, 2, 5, gold); p.put(CX + 9, hy0 + 6, t('#5a4010')); p.hline(CX + 2, sl, hy0 + 8, shade(gold, -0.2)); p.vline(sl, hy0 + 7, hy0 + 8, shade(gold, -0.2)); });
      return { hL: { x: CX + 2, y: hy0 + 7 }, hR: { x: sl - 1, y: hy0 + 8 } };
    }
    case 19: { // clarinete
      extras.push(() => { p.line(CX + 1, hy0 + 6, CX + 3, ty0 + 8, t('#1a1a1e')); p.hline(CX + 2, CX + 4, ty0 + 9, t('#2a2a30')); p.put(CX + 2, ty0 + 3, t('#c8ccd6')); p.put(CX + 2, ty0 + 5, t('#c8ccd6')); });
      return { hL: { x: CX + 1, y: ty0 + 1 }, hR: { x: CX + 3, y: ty0 + 5 + alt } };
    }
    case 20: { // flauta
      extras.push(() => { p.hline(CX + 1, CX + 10, hy0 + 6, t('#d8dce4')); p.put(CX + 5, hy0 + 6, t('#8a8a94')); p.put(CX + 7, hy0 + 6, t('#8a8a94')); });
      return { hL: { x: CX + 3, y: hy0 + 7 }, hR: { x: CX + 8, y: hy0 + 7 - alt } };
    }
    case 23: { // sampler / MPC
      extras.push(() => {
        p.rect(CX - 4, ty0 + 5, 8, 4, t('#9aa0aa')); p.hline(CX - 4, CX + 3, ty0 + 5, t('#c8ccd4'));
        const pads = [t('#e04a4a'), t('#e8c040'), t('#40c0e0'), t('#60d070')];
        for (let i = 0; i < 4; i++) p.put(CX - 3 + i * 2, ty0 + 7, pads[(i + alt) % 4]);
      });
      return { hL: { x: CX - 3 + alt, y: ty0 + 5 }, hR: { x: CX + 2, y: ty0 + 5 - alt } };
    }
    case 24: { // headset (canta dançando)
      extras.push(() => { p.line(hx0, hy0 + 4, hx0 + 3, hy0 + 6, C('#2a2a2e')); p.put(hx0 + 3, hy0 + 6, C('#9a9aa0')); });
      return { hL: alt ? { x: shL.x - 3, y: ty0 - 2 } : { x: shL.x - 2, y: ty0 + 4 }, hR: alt ? { x: shR.x + 2, y: ty0 + 4 } : { x: shR.x + 3, y: ty0 - 2 } };
    }
    default: { // 25 alaúde / buzuqui
      const g = t('#a0602a');
      const nx = CX + 6, ny = ty0 + 1;
      extras.push(() => { p.line(CX - 1, by - 1, nx, ny, t('#4a2a14')); p.rect(nx, ny - 2, 2, 2, t('#2a1a10')); p.ellipse(CX - 2.5, by + 1.5, 3.4, 2.8, g); for (let x = CX - 5; x <= CX; x += 2) p.vline(x, by, by + 3, shade(g, -0.25)); p.disc(CX - 2, by, 0.9, hole); });
      return strum(nx, ny);
    }
  }
}

function drawFigure(p: Px, look: Appearance, pal: Palette, o: FigOpts): void {
  const col = colorsFor(look, pal);
  const e = pal.era;
  const hw = look.body === 4 ? 5 : look.body === 3 ? 4 : [3, 4, 4][look.body % 3]; // r29: 3 atlético, 4 grandalhão
  const heavy = look.body === 2 || look.body === 4;
  const broad = look.body === 3 ? 1 : 0;
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
  const n27 = look.outfit >= 4 ? look.outfit : 0; // rodada 27: roupas novas (desenho próprio)
  const outfit = n27 ? -1 : look.outfit % 4;
  const long27 = LONG27.has(n27);
  const dress = (outfit === 2 && look.sx !== 'm') || (n27 === 10 && look.sx !== 'm'); // rodada 15: homem de casaco longo usa calça
  const legC = long27 ? col.clothD : dress ? (e === '1920' ? tone(C('#6a5040'), pal) : col.skin) : col.pants;
  const legD = long27 ? shade(col.clothD, -0.15) : dress ? (e === '1920' ? shade(legC, -0.2) : col.skinD) : col.pantsD;
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
      if ((e === '1960' || n27 === 16) && !dress) { p.put(x0 - 1, footY - 2, c); p.put(x0 + w, footY - 2, c); }
      if (n27 === 12) p.vline(dark ? x0 + w - 1 : x0, hip + 1, footY - 2, tone(C('#f2f2f2'), pal)); // listra do agasalho
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
  const shoulderPad = (e === '1980' && outfit === 1 ? 1 : 0) || broad;
  const torso = (c: Col) => {
    p.rect(tx0 - shoulderPad, ty0, tw + shoulderPad * 2, 1, c);
    p.rect(tx0, ty0 + 1, tw, ty1 - ty0, c);
    if (heavy) p.rect(tx0 - 1, ty0 + 3, tw + 2, ty1 - ty0 - 3, c);
    if (broad) p.rect(tx0 - 1, ty0 + 1, tw + 2, 2, c); // r29: atlético (ombros largos, cintura fina)
    p.vline(tx0 + tw - 1 + (heavy ? 1 : 0), ty0 + 1, ty1, shade(c, -0.18));
    p.hline(tx0, tx0 + tw - 1, ty0, shade(c, 0.12));
  };
  let sleeve = col.cloth;
  let sleeveFrac = 0.75;
  let collar27: (() => void) | null = null;
  if (n27) {
    const r27 = outfit27(p, n27, { col, pal, look, front, tx0, tw, ty0, ty1, hip, torso });
    sleeve = r27.sleeve;
    sleeveFrac = r27.frac;
    collar27 = r27.collar ?? null;
  } else if (outfit === 0) {
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
  if (look.tat === 2 && front) p.put(CX - 1, ty0 - 1, mix(col.skinD, C('#1a2a4a'), 0.6)); // rodada 27
  if (collar27) collar27();
  if (look.nk && front) neck27(p, look.nk, col, pal, tx0, tw, ty0, ty1);

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
  const after27: (() => void)[] = [];
  const ins27 = playing && front && role ? instFor(look, role, o.year ?? 1960) : 0;
  if (ins27 && !(ins27 === 16 && role === 'guitar')) {
    const r = inst27(p, ins27, { col, pal, e, role: role!, alt, ty0, hy0, hx0, shL, shR, extras, seed: lookKey(look) });
    hL = r.hL; hR = r.hR;
  } else if (playing && front && role) {
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
  if (ins27 === 16 && role === 'guitar') after27.push(() => { // gaita no suporte (folk)
    p.line(CX - 3, ty0, CX - 2, hy0 + 7, C('#8a8a92')); p.line(CX + 2, ty0, CX + 2, hy0 + 7, C('#8a8a92'));
    p.hline(CX - 2, CX + 2, hy0 + 7, C('#c8ccd6')); p.put(CX - 1, hy0 + 7, C('#5a5a64'));
  });
  if (sitting && !playing) {
    hL = { x: CX - 3, y: ty0 + 6 };
    hR = { x: CX + 2, y: ty0 + 6 };
  }
  const tatC = look.tat === 1 || look.tat === 4 ? mix(col.skinD, C('#24345a'), 0.55) : undefined;
  if (!front) {
    // de costas: instrumento atrás do corpo não aparece; braços simples
    arm(p, shL, hL, sleeve, col.skin, sleeveFrac, -1, look.tat === 1 ? tatC : undefined);
    arm(p, shR, hR, shade(sleeve, -0.1), col.skinD, sleeveFrac, 1, tatC);
    for (const x of extras) if (o.carry) x();
    return;
  }
  for (const x of extras) x();
  arm(p, shL, hL, sleeve, col.skin, sleeveFrac, -1, look.tat === 1 ? tatC : undefined);
  arm(p, shR, hR, shade(sleeve, -0.1), col.skin, sleeveFrac, 1, tatC);
  for (const x of after27) x();
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
export function avatarSprite(look0: Appearance, o: AvatarOpts): Sprite {
  const look = gate27(look0, o.year); // rodada 27: peça que ainda não existe no ano cai para a antiga
  const era = eraOf(o.year);
  const pose = o.pose ?? 'stand';
  const dir = o.dir ?? 'SE';
  const frame = pose === 'walk' ? (o.frame ?? 0) % 4 : (o.frame ?? 0) % 4;
  const role = o.role ?? null;
  const synth = o.synthetic || role === 'synthetic';
  const key = `${lookKey(look)}|${era}|${role}|${pose}|${dir}|${frame}|${o.carry ? 1 : 0}|${o.variant ?? 0}|${synth ? 1 : 0}${look.inst ? `|y${o.year}` : ''}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const pal = PALETTES[era];
  const p = new Px(AV_W, AV_H);
  const view = dir === 'SE' || dir === 'SW' ? 'front' : 'back';
  drawFigure(p, look, pal, { view, pose, frame, role: role === 'synthetic' ? 'synthetic' : role, carry: !!o.carry, variant: o.variant ?? 0, year: o.year });
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

// ---------- retrato: peças da rodada 27 ----------

/** Ombros do retrato: x mínimo/máximo da linha y (mesma conta do laço dos ombros). */
const shoulderSpan = (w: number, y: number): [number, number] => { const ww = w + Math.min(3, y - 24); return [16 - ww, 15 + ww]; };

function portrait27(p: Px, n: number, col: Colors, pal: Palette, w: number): void {
  const gold = tone(C('#e0b840'), pal);
  const white = tone(C('#f2f0ea'), pal);
  const eachS = (fn: (x: number, y: number) => void, y0 = 24) => { for (let y = y0; y < 32; y++) { const [a, b] = shoulderSpan(w, y); for (let x = a; x <= b; x++) fn(x, y); } };
  const collarPts = (c: Col, deep = 27) => { p.poly([[11, 24], [14, 24], [14, deep]], c); p.poly([[21, 24], [18, 24], [18, deep]], shade(c, -0.1)); };
  switch (n) {
    case 4: // jaqueta de couro
      p.poly([[13.5, 24], [18.5, 24], [16, 31]], col.shirt);
      p.poly([[10, 24], [14, 24], [15, 30], [11, 27]], col.clothL); p.poly([[22, 24], [18, 24], [17, 30], [21, 27]], shade(col.cloth, 0.08));
      p.vline(19, 27, 31, tone(C('#c8ccd8'), pal)); p.put(shoulderSpan(w, 27)[0] + 1, 27, col.clothL); p.put(shoulderSpan(w, 28)[0] + 2, 28, col.clothL);
      break;
    case 5: // jaqueta jeans
      p.rect(15, 24, 2, 2, col.shirt); collarPts(col.clothL);
      p.vline(16, 26, 31, col.clothD); p.put(17, 27, tone(C('#c8ccd8'), pal)); p.put(17, 30, tone(C('#c8ccd8'), pal));
      p.rect(9, 27, 4, 2, col.clothD); p.hline(9, 12, 27, col.clothL); p.rect(20, 27, 4, 2, col.clothD); p.hline(20, 23, 27, col.clothL);
      break;
    case 6: // camisa aberta
      p.poly([[13, 24], [19, 24], [16, 31]], col.skin); p.line(16, 27, 16, 31, col.skinD); collarPts(col.clothL, 28);
      break;
    case 7: { // regata
      for (let y = 26; y < 32; y++) { const hw2 = 7 + (y >= 28 ? 1 : 0); p.hline(16 - hw2, 15 + hw2, y, col.cloth); p.put(15 + hw2, y, col.clothD); }
      p.hline(13, 18, 26, col.skin); p.hline(14, 17, 27, col.skin); p.rect(9, 24, 2, 2, col.cloth); p.rect(21, 24, 2, 2, col.clothD);
      break;
    }
    case 8: { // smoking
      p.poly([[12.5, 24], [19.5, 24], [16, 31]], col.shirt);
      const bk = tone(C('#141418'), pal);
      p.poly([[12, 23], [15, 24.5], [12, 26]], bk); p.poly([[20, 23], [17, 24.5], [20, 26]], bk); p.rect(15, 24, 2, 2, shade(bk, 0.2));
      p.line(12, 24, 15, 31, col.clothL); p.line(19, 24, 17, 31, col.clothL); p.put(16, 28, bk); p.put(16, 30, bk);
      break;
    }
    case 9: { // kaftan / dashiki
      const pr = mix(col.cloth, gold, 0.6);
      eachS((x, y) => { if ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) p.put(x, y, (x + y * 3) % 2 ? col.clothD : pr); }, 25);
      p.line(12, 24, 16, 29, gold); p.line(20, 24, 16, 29, gold); p.line(13, 24, 16, 28, col.clothD); p.line(19, 24, 16, 28, col.clothD);
      p.poly([[13.5, 24], [18.5, 24], [16, 27]], col.skin);
      break;
    }
    case 10: // lantejoulas
      eachS((x, y) => { if (dith(x, y, 0.3)) p.put(x, y, col.clothL); if ((x * 7 + y * 3) % 11 === 0) p.put(x, y, white); });
      p.poly([[13, 24], [19, 24], [16, 27]], col.skin);
      break;
    case 11: { // casaco militar
      for (const y of [26, 28, 30]) { p.hline(11, 20, y, gold); p.put(10, y + 1, gold); p.put(21, y + 1, gold); }
      const [a, b] = shoulderSpan(w, 24);
      p.rect(a, 24, 4, 2, gold); p.rect(b - 3, 24, 4, 2, shade(gold, -0.15)); p.hline(a, a + 3, 26, shade(gold, -0.3)); p.hline(b - 3, b, 26, shade(gold, -0.3));
      p.rect(13, 22, 6, 3, col.clothD); p.hline(13, 18, 22, gold);
      break;
    }
    case 12: { // agasalho
      p.rect(12, 22, 8, 3, col.clothD); p.vline(16, 22, 31, tone(C('#d8d8de'), pal));
      const [a] = shoulderSpan(w, 24); const b = 31 - a;
      p.line(a + 1, 25, a + 1, 31, white); p.line(a + 3, 25, a + 3, 31, white); p.line(b - 1, 25, b - 1, 31, shade(white, -0.15)); p.line(b - 3, 25, b - 3, 31, shade(white, -0.15));
      break;
    }
    case 13: // moletom com capuz
      p.hline(11, 20, 24, col.clothD); p.hline(10, 21, 25, col.clothD); p.put(10, 24, col.clothD); p.put(21, 24, col.clothD); p.hline(12, 19, 23, col.clothD);
      p.vline(14, 26, 29, col.shirt); p.vline(18, 26, 28, col.shirt); p.put(14, 30, shade(col.shirt, -0.2));
      break;
    case 14: { // top cropped
      for (let y = 27; y < 32; y++) { const [a, b] = shoulderSpan(w - 2, y); p.hline(a, b, y, col.cloth); p.put(b, y, col.clothD); }
      const [a, b] = shoulderSpan(w - 2, 27);
      p.hline(a, b, 27, col.clothL); p.vline(a + 2, 24, 26, col.cloth); p.vline(b - 2, 24, 26, col.clothD);
      break;
    }
    case 15: { // xadrez
      const dk = mix(col.cloth, C('#101014'), 0.4);
      eachS((x, y) => { if (x % 4 === 0 && y % 4 === 0) p.put(x, y, shade(dk, -0.25)); else if (x % 4 === 0 || y % 4 === 0) p.put(x, y, dk); }, 25);
      p.poly([[14, 24], [18, 24], [16, 27]], col.shirt); collarPts(col.clothL); p.vline(16, 27, 31, dk);
      break;
    }
    case 16: // macacão (gola alta e tachas)
      p.poly([[8, 24], [14, 24], [13, 29]], white); p.poly([[24, 24], [18, 24], [19, 29]], shade(white, -0.12));
      p.poly([[14, 24], [18, 24], [16, 30]], col.skin);
      for (const [x, y] of [[10, 29], [12, 31], [20, 31], [22, 29], [16, 31], [7, 30], [25, 30]]) p.put(x, y, gold);
      break;
    case 17: // franjas
      p.poly([[13.5, 24], [18.5, 24], [16, 29]], col.shirt);
      eachS((x, y) => { if (y === 28) p.put(x, y, col.clothD); else if (y >= 29 && y <= 30 && x % 2 === 0) p.put(x, y, col.clothD); }, 28);
      break;
    case 18: // qipao: gola mandarim e fecho diagonal
      p.rect(14, 22, 4, 3, col.cloth); p.hline(14, 17, 22, gold); p.vline(17, 22, 24, col.clothD);
      p.line(16, 25, 21, 28, col.clothD); p.put(17, 26, gold); p.put(19, 27, gold);
      eachS((x, y) => { if ((x * 5 + y * 3) % 13 === 0) p.put(x, y, col.clothL); }, 26);
      break;
    case 19: { // sári: pallu sobre o ombro
      const sash = mix(col.cloth, gold, 0.3);
      p.poly([[18, 24], [25, 24], [13, 32], [6, 32]], sash); p.line(18, 24, 6, 32, gold); p.line(25, 24, 13, 32, gold);
      p.poly([[13, 24], [17, 24], [15, 26]], col.skin);
      break;
    }
    case 20: // quimono: gola cruzada
      p.poly([[18, 24], [20, 24], [16, 31], [14, 31]], col.shirt); p.poly([[12, 24], [14, 24], [18, 31], [16, 31]], shade(col.shirt, -0.06));
      eachS((x, y) => { if ((x * 3 + y * 7) % 17 === 0) p.put(x, y, col.clothL); }, 25);
      break;
    case 21: // gola alta
      p.rect(13, 22, 6, 3, col.cloth); p.hline(13, 18, 22, col.clothL); p.vline(14, 23, 24, col.clothD); p.vline(16, 23, 24, col.clothD); p.vline(18, 23, 24, col.clothD);
      break;
    case 22: // colete sobre camisa
      for (let y = 24; y < 32; y++) { const [a, b] = shoulderSpan(w - 3, y); p.hline(a, b, y, col.cloth); p.put(b, y, col.clothD); }
      p.poly([[13, 24], [19, 24], [16, 30]], col.shirt); p.rect(15, 25, 2, 4, col.accent); p.put(16, 30, col.clothD); p.put(16, 31, col.clothD);
      break;
    case 23: // poncho
      p.hline(4, 27, 27, col.accent); p.hline(4, 27, 28, shade(col.accent, -0.2)); p.hline(4, 27, 30, white);
      p.poly([[13, 24], [19, 24], [16, 27]], col.clothD);
      break;
    case 24: { // camisa florida
      const yel = tone(C('#f0d040'), pal);
      eachS((x, y) => { if ((x * 3 + y * 5) % 9 === 0) { p.put(x, y, white); p.put(x + 1, y, white); p.put(x, y + 1, yel); } }, 25);
      p.poly([[14, 24], [18, 24], [16, 28]], col.skin); collarPts(col.clothL, 27);
      break;
    }
    // ---- rodada 29 ----
    case 26: // terno zoot
      p.poly([[12.5, 24], [19.5, 24], [16, 31]], col.shirt); p.rect(15, 25, 2, 6, col.accent);
      p.line(12, 24, 15, 31, col.clothL); p.line(19, 24, 17, 31, shade(col.cloth, -0.25)); p.line(18, 29, 22, 31, gold);
      break;
    case 27: // guayabera
      p.poly([[14, 24], [18, 24], [16, 27]], col.skin); collarPts(col.clothL, 27);
      eachS((x, y) => { if ((x === 11 || x === 20) && y % 2) p.put(x, y, col.clothD); }, 25);
      break;
    case 28: { // agbada: bordado dourado no peito
      p.poly([[13.5, 24], [18.5, 24], [16, 27]], col.skin);
      p.line(12, 24, 16, 30, gold); p.line(20, 24, 16, 30, gold); p.hline(14, 18, 28, gold); p.put(16, 29, shade(gold, 0.3));
      break;
    }
    case 29: // hanbok: gola branca cruzada e laço
      p.line(13, 24, 17, 28, white); p.line(19, 24, 15, 28, white); p.vline(17, 28, 31, col.accent); p.put(18, 29, col.accent); p.put(18, 30, shade(col.accent, -0.2));
      break;
    case 30: { // jaqueta college
      eachS((x, y) => { const [a, b] = shoulderSpan(w, y); if (x <= a + 2 || x >= b - 2) p.put(x, y, white); });
      p.vline(16, 25, 31, col.clothD); p.rect(11, 27, 3, 3, white); p.put(12, 28, col.accent); p.hline(14, 18, 24, white);
      break;
    }
    case 31: { // terninho de ombreiras
      const [a, b] = shoulderSpan(w, 24);
      p.rect(a - 1, 24, 4, 2, col.clothL); p.rect(b - 2, 24, 4, 2, col.cloth);
      p.poly([[12.5, 24], [19.5, 24], [16, 31]], col.shirt); p.line(12, 24, 15, 31, col.clothL); p.line(19, 24, 17, 31, shade(col.cloth, -0.25)); p.put(16, 30, gold);
      break;
    }
    case 32: { // colete de patches
      const pc = [tone(C('#e04848'), pal), white, tone(C('#f0c040'), pal), tone(C('#48b85c'), pal)];
      p.rect(14, 24, 4, 8, col.shirt);
      eachS((x, y) => { if ((x < 14 || x > 17) && (x * 5 + y * 3) % 7 === 0) p.put(x, y, pc[(x + y) % 4]); }, 25);
      break;
    }
    case 33: // camisa de futebol
      eachS((x, y) => { if (x % 3 === 1) p.put(x, y, col.accent); }, 25);
      p.poly([[14, 24], [18, 24], [16, 27]], col.skin); p.line(14, 24, 16, 27, white); p.line(18, 24, 16, 27, white);
      break;
    default: { // 25 camiseta estampada
      p.rect(14, 24, 4, 1, col.skinD);
      const pr = printOn(col.cloth, pal);
      p.rect(13, 26, 6, 5, pr); p.put(14, 27, col.accent); p.put(17, 27, col.accent); p.hline(14, 17, 29, col.accent);
      break;
    }
  }
}

/** Tatuagem visível no retrato: pescoço e ombros nus. */
function tatPortrait27(p: Px, tat: number, col: Colors): void {
  const ink = mix(col.skinD, C('#24345a'), 0.55);
  if (tat === 2) { for (let y = 21; y < 25; y++) for (let x = 14; x < 18; x++) if ((x + y) % 3 === 0) p.put(x, y, ink); return; }
  for (let y = 24; y < 32; y++) for (let x = 0; x < 32; x++) if ((p.get(x, y) === col.skin || p.get(x, y) === col.skinD) && (x < 13 || x > 18) && (tat === 1 || x > 18) && (x * 3 + y) % 4 === 0) p.put(x, y, ink);
}

function neckPortrait27(p: Px, nk: number, col: Colors, pal: Palette, w: number): void {
  const gold = tone(C('#e8c040'), pal);
  const curve = (deep: number, c: (i: number) => Col, x0 = 12, x1 = 19) => {
    const mid = (x0 + x1) / 2;
    for (let x = x0; x <= x1; x++) { const y = Math.round(24 + (deep - 24) * (1 - ((x - mid) / ((x1 - x0) / 2)) ** 2)); p.put(x, y, c(x)); }
  };
  switch (nk) {
    case 1: curve(28, (x) => (x % 2 ? gold : shade(gold, 0.3))); break;
    case 2: curve(29, () => gold, 11, 20); curve(30, (x) => (x % 2 ? shade(gold, -0.25) : gold), 12, 19); p.rect(15, 29, 3, 3, gold); p.put(16, 30, shade(gold, 0.4)); break;
    case 3: { const pe = tone(C('#f2eee4'), pal); curve(28, (x) => (x % 2 ? pe : shade(pe, -0.2))); curve(30, (x) => (x % 2 ? shade(pe, -0.2) : pe), 11, 20); break; }
    case 4: { const bc = BEADS27.map((x) => tone(C(x), pal)); curve(29, (x) => bc[x % 4], 11, 20); break; }
    case 5: { const si = tone(C('#c8ccd8'), pal); curve(28, () => shade(si, -0.15)); p.vline(16, 28, 31, si); p.hline(15, 17, 29, si); break; }
    case 6: p.rect(13, 22, 6, 3, col.accent); p.hline(13, 18, 22, shade(col.accent, 0.25)); p.vline(14, 25, 28, col.accent); p.vline(15, 25, 27, shade(col.accent, -0.2)); break;
    case 7: { const bk = tone(C('#1a1a20'), pal); p.hline(14, 17, 22, bk); p.hline(14, 17, 23, shade(bk, 0.2)); p.put(15, 24, tone(C('#c8ccd8'), pal)); break; }
    case 8: {
      const pk = tone(C('#ff7ac0'), pal);
      for (let y = 23; y < 28; y++) { const [a, b] = shoulderSpan(w, Math.max(24, y)); for (let x = a - 1; x <= b + 1; x++) if (y <= 25 ? dith(x, y, 0.6) : (x < a + 3 || x > b - 3) && dith(x, y, 0.5)) p.put(x, y, (x + y) % 3 ? pk : shade(pk, 0.3)); }
      break;
    }
    case 9: { const bk = tone(C('#141418'), pal); p.poly([[12, 23], [15, 24.5], [12, 26]], bk); p.poly([[20, 23], [17, 24.5], [20, 26]], bk); p.rect(15, 24, 2, 2, shade(bk, 0.25)); break; }
    case 10: { curve(28, () => col.clothD); const si = tone(C('#d0d4dc'), pal); p.rect(15, 28, 3, 3, si); p.put(16, 28, shade(si, -0.4)); p.put(16, 29, shade(si, -0.4)); p.put(15, 30, shade(si, -0.4)); p.put(17, 30, shade(si, -0.4)); break; }
  }
}

// ---------- retrato ----------

const portraitCache = new Map<string, HTMLCanvasElement>();
const portraitUrlCache = new Map<string, string>();

type PersonLike = { id: string; look?: Appearance; role?: Role; born?: number };

/** Busto 32×32 de frente. */
export function portraitPx(person: PersonLike, year: number): Px {
  const look = gate27(lookOf(person), year);
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
  const n27 = look.outfit >= 4 ? look.outfit : 0; // rodada 27
  const outfit = n27 ? -1 : look.outfit % 4;
  const shirtC = n27 === 7 || n27 === 14 ? col.skin : n27 === 22 ? col.shirt : outfit === 0 && pal.era === '1920' ? col.shirt : col.cloth;
  const w = look.body === 4 ? 13 : look.body === 3 ? 12 : [9, 11, 12][look.body % 3]; // r29: corpos 3 e 4
  for (let y = 24; y < 32; y++) {
    const ww = w + Math.min(3, y - 24);
    p.hline(16 - ww, 15 + ww, y, y === 24 ? shade(shirtC, 0.15) : shirtC);
    p.put(15 + ww, y, shade(shirtC, -0.2));
  }
  // pescoço
  p.rect(14, 21, 4, 4, col.skinD);
  p.rect(14, 21, 3, 3, col.skin);
  if (n27) portrait27(p, n27, col, pal, w);
  else if (outfit === 1) {
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
  if (look.tat === 1 || look.tat === 2 || look.tat === 4) tatPortrait27(p, look.tat, col);
  if (look.nk) neckPortrait27(p, look.nk, col, pal, w);
  const head: HeadCtx = { p, x0: 8, y0: 6, s: 2, col, look, era: pal.era, view: 'front' };
  drawHead(head);
  if (person.role === 'synthetic') hologram(p, pal, 0);
  p.outline(pal.outline);
  return p;
}

/** Retrato ampliado em canvas (px = tamanho de cada pixel). */
export function portraitCanvas(person: PersonLike, s?: GameState | number | null, px = 3): HTMLCanvasElement {
  const year = typeof s === 'number' ? s : s?.year ?? 1960;
  const look = gate27(lookOf(person), year);
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
  const look = gate27(lookOf(person), year);
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
