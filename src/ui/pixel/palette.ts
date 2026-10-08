// Paletas limitadas por era (GDD §25): cada década tem materiais, luz e acentos próprios.

import { C, mix, type Col } from './px';

export type EraId = '1920' | '1950' | '1960' | '1980' | '1990' | '2000' | '2010' | '2020' | '2030';

export const ERAS: EraId[] = ['1920', '1950', '1960', '1980', '1990', '2000', '2010', '2020', '2030'];

/** Era visual de um ano. 1960 cobre 60s e 70s (laranja, marrom, lambri). */
export function eraOf(year: number): EraId {
  if (year < 1946) return '1920';
  if (year < 1960) return '1950';
  if (year < 1980) return '1960';
  if (year < 1990) return '1980';
  if (year < 2000) return '1990';
  if (year < 2010) return '2000';
  if (year < 2020) return '2010';
  if (year < 2030) return '2020';
  return '2030';
}

export function eraIndex(e: EraId): number {
  return ERAS.indexOf(e);
}

export type FloorKind = 'parquet' | 'wood' | 'carpet' | 'shag' | 'checker' | 'concrete' | 'tiles' | 'glow' | 'rubber';
export type WallKind = 'wainscot' | 'paper' | 'panel' | 'plain' | 'brick' | 'glass' | 'tile';

export interface Palette {
  era: EraId;
  outline: Col;
  bg: Col;
  ground: [Col, Col];
  groundKind: 'cobble' | 'sidewalk' | 'asphalt' | 'plaza' | 'grass';
  wall: Col; // face interna
  wall2: Col; // detalhe (lambri, faixa)
  trim: Col; // rodapé e topo
  wallKind: WallKind;
  wood: Col;
  woodDark: Col;
  metal: Col;
  metalDark: Col;
  fabric: Col;
  fabric2: Col;
  accent: Col;
  accent2: Col;
  glow: Col;
  screen: Col;
  glass: Col;
  plant: Col;
  pot: Col;
  paper: Col;
  gold: Col;
  lamp: Col;
  sky: Col;
  /** pisos por tipo de sala */
  floors: Record<'studio' | 'control' | 'lounge' | 'office' | 'hall' | 'garage', { kind: FloorKind; a: Col; b: Col }>;
  /** tom de pele/roupa puxado para o sépia (0..1) */
  sepia: number;
}

const P = (era: EraId, o: Omit<Palette, 'era'>): Palette => ({ era, ...o });

export const PALETTES: Record<EraId, Palette> = {
  '1920': P('1920', {
    outline: C('#24150d'), bg: C('#1d140f'), ground: [C('#6d6457'), C('#5a5247')], groundKind: 'cobble',
    wall: C('#c9a878'), wall2: C('#6e4a2c'), trim: C('#4a2f1c'), wallKind: 'wainscot',
    wood: C('#8a5a33'), woodDark: C('#5a3820'), metal: C('#c9a24a'), metalDark: C('#7d6127'),
    fabric: C('#7a2e2a'), fabric2: C('#3f5a3a'), accent: C('#c9a24a'), accent2: C('#9c3b2c'), glow: C('#ffd889'),
    screen: C('#3a2a1c'), glass: C('#a8bfb8'), plant: C('#4d7a3a'), pot: C('#9a5a34'), paper: C('#efe2c2'), gold: C('#e3c057'),
    lamp: C('#ffe2a0'), sky: C('#d9c39a'),
    floors: {
      studio: { kind: 'parquet', a: C('#8f5d34'), b: C('#77492a') },
      control: { kind: 'wood', a: C('#7d5230'), b: C('#6a4428') },
      lounge: { kind: 'carpet', a: C('#7e2f2b'), b: C('#6b2623') },
      office: { kind: 'wood', a: C('#94653d'), b: C('#7f5432') },
      hall: { kind: 'checker', a: C('#d8c9a6'), b: C('#3b2b20') },
      garage: { kind: 'concrete', a: C('#8a8173'), b: C('#7a7164') },
    },
    sepia: 0.28,
  }),
  '1950': P('1950', {
    outline: C('#231a24'), bg: C('#1c1820'), ground: [C('#b8b2a4'), C('#a39d90')], groundKind: 'sidewalk',
    wall: C('#e8d9b8'), wall2: C('#8fc6b8'), trim: C('#b35a52'), wallKind: 'paper',
    wood: C('#b07a48'), woodDark: C('#7a5030'), metal: C('#c8ccd0'), metalDark: C('#7d838a'),
    fabric: C('#e48c8c'), fabric2: C('#7cc0b4'), accent: C('#e05a4e'), accent2: C('#6cc3b5'), glow: C('#ffe08a'),
    screen: C('#9fb3a8'), glass: C('#bfe0e8'), plant: C('#4f8a46'), pot: C('#e5b05a'), paper: C('#f6eedb'), gold: C('#e8c45a'),
    lamp: C('#fff0b8'), sky: C('#a8d4e8'),
    floors: {
      studio: { kind: 'wood', a: C('#b98552'), b: C('#a27245') },
      control: { kind: 'tiles', a: C('#c9c2b0'), b: C('#b6ae9b') },
      lounge: { kind: 'checker', a: C('#f1e8d6'), b: C('#d0645b') },
      office: { kind: 'tiles', a: C('#d6ccb5'), b: C('#c2b79e') },
      hall: { kind: 'checker', a: C('#efe7d6'), b: C('#2f2a2e') },
      garage: { kind: 'concrete', a: C('#9a948a'), b: C('#8b857b') },
    },
    sepia: 0.1,
  }),
  '1960': P('1960', {
    outline: C('#24160e'), bg: C('#1e140e'), ground: [C('#7f9a52'), C('#6c8645')], groundKind: 'grass',
    wall: C('#a86c3c'), wall2: C('#7a4a26'), trim: C('#4e2e16'), wallKind: 'panel',
    wood: C('#9c5f30'), woodDark: C('#5e3518'), metal: C('#b9b2a2'), metalDark: C('#6e675a'),
    fabric: C('#d9782a'), fabric2: C('#8a8a2a'), accent: C('#e8902c'), accent2: C('#c84f2a'), glow: C('#ffb347'),
    screen: C('#7d8c6a'), glass: C('#c8d8b0'), plant: C('#5e8a2e'), pot: C('#c06a2a'), paper: C('#f1e3c0'), gold: C('#e2b84a'),
    lamp: C('#ffc870'), sky: C('#f0c880'),
    floors: {
      studio: { kind: 'shag', a: C('#c86a26'), b: C('#a65520') },
      control: { kind: 'wood', a: C('#8e5a30'), b: C('#7a4c28') },
      lounge: { kind: 'shag', a: C('#b98a2c'), b: C('#9c7224') },
      office: { kind: 'carpet', a: C('#8e7a3a'), b: C('#7b6830') },
      hall: { kind: 'tiles', a: C('#d6b98a'), b: C('#c4a676') },
      garage: { kind: 'concrete', a: C('#8f877a'), b: C('#80786c') },
    },
    sepia: 0.06,
  }),
  '1980': P('1980', {
    outline: C('#170f22'), bg: C('#120c1e'), ground: [C('#3c3a4a'), C('#33313f')], groundKind: 'asphalt',
    wall: C('#5c5a78'), wall2: C('#ff4fa3'), trim: C('#2d2a44'), wallKind: 'plain',
    wood: C('#6b5a6e'), woodDark: C('#3e3446'), metal: C('#9ea3b8'), metalDark: C('#545a72'),
    fabric: C('#3fc8c8'), fabric2: C('#ff5fa8'), accent: C('#ff4fa3'), accent2: C('#35e0e0'), glow: C('#ff7ad1'),
    screen: C('#2e7fd8'), glass: C('#9fc8f0'), plant: C('#3f9a6a'), pot: C('#e8e2d8'), paper: C('#eeeaf2'), gold: C('#f0c84a'),
    lamp: C('#ff9ad6'), sky: C('#5a3a8a'),
    floors: {
      studio: { kind: 'carpet', a: C('#3b3654'), b: C('#332e4a') },
      control: { kind: 'carpet', a: C('#2e2a42'), b: C('#28243a') },
      lounge: { kind: 'checker', a: C('#e8e4ee'), b: C('#24203a') },
      office: { kind: 'carpet', a: C('#6a6880'), b: C('#5e5c74') },
      hall: { kind: 'tiles', a: C('#8e8aa6'), b: C('#7e7a96') },
      garage: { kind: 'concrete', a: C('#6e6a78'), b: C('#625e6c') },
    },
    sepia: 0,
  }),
  '1990': P('1990', {
    outline: C('#1c1b1e'), bg: C('#18181c'), ground: [C('#8a8a86'), C('#7a7a76')], groundKind: 'sidewalk',
    wall: C('#cfc8b6'), wall2: C('#8f8a7e'), trim: C('#5c5850'), wallKind: 'plain',
    wood: C('#9a8060'), woodDark: C('#5e4c38'), metal: C('#a8a8a4'), metalDark: C('#5f5f5c'),
    fabric: C('#2f3a4f'), fabric2: C('#6a2f3a'), accent: C('#3f7a5c'), accent2: C('#a63c3c'), glow: C('#7fe08a'),
    screen: C('#3a5a8c'), glass: C('#b8c8cc'), plant: C('#3f7a3e'), pot: C('#7a5a3e'), paper: C('#f2f0e8'), gold: C('#e2c05a'),
    lamp: C('#f2ecc8'), sky: C('#9ab0c4'),
    floors: {
      studio: { kind: 'carpet', a: C('#4a4a50'), b: C('#424248') },
      control: { kind: 'carpet', a: C('#3c3c44'), b: C('#35353c') },
      lounge: { kind: 'wood', a: C('#a8865c'), b: C('#97784f') },
      office: { kind: 'tiles', a: C('#8c8a90'), b: C('#7f7d84') },
      hall: { kind: 'tiles', a: C('#b8b4a8'), b: C('#a8a498') },
      garage: { kind: 'concrete', a: C('#87857f'), b: C('#7a7872') },
    },
    sepia: 0,
  }),
  '2000': P('2000', {
    outline: C('#121a28'), bg: C('#0f1622'), ground: [C('#7e8a96'), C('#707b86')], groundKind: 'sidewalk',
    wall: C('#a9c4e0'), wall2: C('#3a78c8'), trim: C('#2c4a72'), wallKind: 'plain',
    wood: C('#b89a74'), woodDark: C('#6e5a44'), metal: C('#c8d2dc'), metalDark: C('#6a7684'),
    fabric: C('#2c5ea8'), fabric2: C('#e8eef6'), accent: C('#2f8ae8'), accent2: C('#f08a2a'), glow: C('#7ac8ff'),
    screen: C('#5ab0f0'), glass: C('#cfe6f6'), plant: C('#3f9a4e'), pot: C('#e8eef6'), paper: C('#f4f8fc'), gold: C('#ecc860'),
    lamp: C('#e6f2ff'), sky: C('#8ec4f0'),
    floors: {
      studio: { kind: 'wood', a: C('#a07850'), b: C('#8f6a46') },
      control: { kind: 'carpet', a: C('#2e3a52'), b: C('#283349') },
      lounge: { kind: 'wood', a: C('#c4a27a'), b: C('#b3926a') },
      office: { kind: 'tiles', a: C('#9aa8b8'), b: C('#8c9aaa') },
      hall: { kind: 'tiles', a: C('#d8e0e8'), b: C('#c6d0da') },
      garage: { kind: 'concrete', a: C('#8c9096'), b: C('#7e8288') },
    },
    sepia: 0,
  }),
  '2010': P('2010', {
    outline: C('#1e1e22'), bg: C('#18181b'), ground: [C('#9a9a96'), C('#8c8c88')], groundKind: 'plaza',
    wall: C('#efefec'), wall2: C('#d6d6d2'), trim: C('#bcbcb6'), wallKind: 'brick',
    wood: C('#d2b48c'), woodDark: C('#8e744f'), metal: C('#d8d8d8'), metalDark: C('#7a7a7c'),
    fabric: C('#a8b0b8'), fabric2: C('#e0c060'), accent: C('#f0c030'), accent2: C('#3c3c40'), glow: C('#ffffff'),
    screen: C('#3a3e48'), glass: C('#dfeaf0'), plant: C('#3d8a4a'), pot: C('#f2f2f0'), paper: C('#ffffff'), gold: C('#e8c860'),
    lamp: C('#fff8e8'), sky: C('#b8d8f0'),
    floors: {
      studio: { kind: 'wood', a: C('#c8a87e'), b: C('#b89870') },
      control: { kind: 'concrete', a: C('#9c9c98'), b: C('#90908c') },
      lounge: { kind: 'wood', a: C('#d4b88e'), b: C('#c6a880') },
      office: { kind: 'concrete', a: C('#b0b0ac'), b: C('#a4a4a0') },
      hall: { kind: 'concrete', a: C('#a8a8a4'), b: C('#9c9c98') },
      garage: { kind: 'concrete', a: C('#949490'), b: C('#888884') },
    },
    sepia: 0,
  }),
  '2020': P('2020', {
    outline: C('#141418'), bg: C('#101014'), ground: [C('#5e8a4e'), C('#527a44')], groundKind: 'grass',
    wall: C('#4a5058'), wall2: C('#2e3238'), trim: C('#24272c'), wallKind: 'plain',
    wood: C('#a8845c'), woodDark: C('#6a5238'), metal: C('#b8bcc4'), metalDark: C('#5c6068'),
    fabric: C('#5a6e5a'), fabric2: C('#c86e4a'), accent: C('#9a5cff'), accent2: C('#2ee8c8'), glow: C('#b98cff'),
    screen: C('#2a2e3a'), glass: C('#b8d0d8'), plant: C('#3fa050'), pot: C('#d8cfc0'), paper: C('#f2f2f2'), gold: C('#ecc860'),
    lamp: C('#d8c8ff'), sky: C('#2c3a5a'),
    floors: {
      studio: { kind: 'wood', a: C('#8a6c4a'), b: C('#7c6042'), },
      control: { kind: 'rubber', a: C('#2c3036'), b: C('#272a30') },
      lounge: { kind: 'wood', a: C('#b08c62'), b: C('#a07e56') },
      office: { kind: 'concrete', a: C('#7a7e84'), b: C('#6e7278') },
      hall: { kind: 'concrete', a: C('#6c7076'), b: C('#62666c') },
      garage: { kind: 'concrete', a: C('#707478'), b: C('#64686c') },
    },
    sepia: 0,
  }),
  '2030': P('2030', {
    outline: C('#06121a'), bg: C('#050d14'), ground: [C('#1c2e38'), C('#16262e')], groundKind: 'plaza',
    wall: C('#1f3a46'), wall2: C('#2ee8d8'), trim: C('#0e2028'), wallKind: 'glass',
    wood: C('#3a5a66'), woodDark: C('#1e3640'), metal: C('#9ec8d0'), metalDark: C('#3e6670'),
    fabric: C('#2a6670'), fabric2: C('#c85ae8'), accent: C('#2ee8d8'), accent2: C('#e85ac8'), glow: C('#5ffff0'),
    screen: C('#0c2a36'), glass: C('#7ae8f0'), plant: C('#3ac88a'), pot: C('#c8eef0'), paper: C('#e8fcff'), gold: C('#f0d870'),
    lamp: C('#a8fff4'), sky: C('#0a1830'),
    floors: {
      studio: { kind: 'glow', a: C('#16303a'), b: C('#132a33') },
      control: { kind: 'glow', a: C('#102630'), b: C('#0e222b') },
      lounge: { kind: 'carpet', a: C('#244852'), b: C('#20404a') },
      office: { kind: 'glow', a: C('#1a343e'), b: C('#172f38') },
      hall: { kind: 'glow', a: C('#1c3640'), b: C('#18313a') },
      garage: { kind: 'concrete', a: C('#2a3a42'), b: C('#24343c') },
    },
    sepia: 0,
  }),
};

export function paletteOf(year: number): Palette {
  return PALETTES[eraOf(year)];
}

const SEPIA = C('#a07850');

/** Tonaliza uma cor para a era (sépia nos anos 20, leve nos 50). */
export function tone(c: Col, pal: Palette): Col {
  return pal.sepia ? mix(c, SEPIA, pal.sepia) : c;
}
