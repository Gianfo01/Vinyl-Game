// Rodada 28 (ARTE) — EMBLEMAS DO SUBMUNDO em pixel art 32×32: brasões semeados no estilo antigo (paleta curta,
// contorno escuro). Forma pelo TIPO (máfia → escudo/cartela com coroa; "firma" → medalhão; sindicato → kamon no
// Japão, losango em Hong Kong; cartel → estrela/sol; gangue → emblema de colete com faixas), cores pela REGIÃO (Itália
// verde-vinho-ouro, Japão preto-vermelho, Brasil verde-ouro…), divisão do campo (pala, faixa, banda, esquartelado,
// chefe, asna, bordadura) e uma CARGA pelo negócio (jukebox, rádio do jabá, cassete pirata, ingresso, mão negra,
// moeda da lavagem, punhal, máscara de carnaval, sanfona dos corridos) ou um bicho (lobo, cobra, águia, touro,
// corvo, aranha, escorpião, caveira, rosa). Golpes também têm selo: pirataria, jabá, bandas-fantasma, dublagem, voz de IA.
// Tudo inventado (nenhuma insígnia real é copiada). Puro e determinístico; <img> memorizado (pxImg28).

import { drawText, fitText, textWidth } from './font';
import { C, Px, dith, hsl, shade, withAlpha, type Col } from './px';
import { K28 as K, OUT28, bmp, h28, layer, pxImg28, rng28 } from './art28kit';
import type { Rng } from '../../core/rng';

export type EmblemKind28 = 'mafia' | 'gang' | 'cartel' | 'syndicate' | 'firm' | 'bootleg' | 'payola' | 'ghost' | 'lipsync' | 'aivoice' | 'fraud' | 'cyber';
export const EMBLEM_KINDS28: EmblemKind28[] = ['mafia', 'gang', 'cartel', 'syndicate', 'firm', 'bootleg', 'payola', 'ghost', 'lipsync', 'aivoice', 'fraud', 'cyber'];
export const CHARGES28 = ['wolf', 'snake', 'eagle', 'bull', 'crow', 'spider', 'scorpion', 'skull', 'rose', 'hand', 'dagger', 'key', 'dice', 'card', 'coin', 'crown',
  'jukebox', 'radio', 'cassette', 'record', 'ticket', 'mask', 'accordion', 'mic', 'money', 'chip', 'bot'] as const; // r29: crime digital
export type Charge28 = (typeof CHARGES28)[number];

export interface EmblemSpec28 { id: string; kind: EmblemKind28; a3?: string; rackets?: string[]; name?: string }

// ---------------------------------------------------------------- cores por região

const REGION: Record<string, [string, string, string]> = {
  ITA: ['#2c7a3c', '#9c2c2c', '#f0c040'], USA: ['#2c3a6a', '#9c2c2c', '#e8dcc0'], GBR: ['#1e2a50', '#7a1a2a', '#d8dce4'],
  JPN: ['#1e1a1c', '#c83a30', '#f4f0e8'], HKG: ['#9c1c1c', '#2a1a10', '#f0c040'], CHN: ['#9c1c1c', '#2a1a10', '#f0c040'], TWN: ['#9c1c1c', '#1e2a50', '#f0c040'],
  BRA: ['#1e7a3a', '#2c3a8a', '#f0c040'], MEX: ['#1e6a3a', '#9c2c2c', '#e8dcc0'], COL: ['#c89820', '#2c3a8a', '#9c2c2c'], RUS: ['#5a1018', '#1e1a1c', '#c09048'],
  JAM: ['#1e7a3a', '#1e1a1c', '#f0c040'], FRA: ['#2c3a8a', '#9c2c2c', '#f4f0e8'], DEU: ['#1e1a1c', '#9c2c2c', '#f0c040'], NGA: ['#1e7a3a', '#f4f0e8', '#c09048'],
  KOR: ['#1e2a50', '#c83a30', '#f4f0e8'], ARG: ['#5a8ac8', '#f4f0e8', '#f0c040'], ESP: ['#9c2c2c', '#c89820', '#f4f0e8'], TUR: ['#9c1c1c', '#f4f0e8', '#f0c040'],
  IND: ['#c86020', '#1e6a3a', '#f4f0e8'], ALB: ['#9c1c1c', '#1e1a1c', '#f0c040'], IRL: ['#1e6a3a', '#c86020', '#f4f0e8'],
};
function tinctures(sp: EmblemSpec28, r: Rng): { a: Col; b: Col; m: Col } {
  const reg = sp.a3 ? REGION[sp.a3] : undefined;
  let a: Col, b: Col, m: Col;
  if (reg) { a = C(reg[0]); b = C(reg[1]); m = C(reg[2]); }
  else { const hue = h28('em', sp.id) % 360; a = hsl(hue, 45, 30); b = hsl(hue + 150, 50, 38); m = r.chance(0.6) ? K.gold : K.silver; }
  if (r.chance(0.4)) [a, b] = [b, a];
  return { a, b, m };
}

// ---------------------------------------------------------------- cargas (12×10 aprox.)

const G: Partial<Record<Charge28, string[]>> = {
  wolf: ['#..........#', '##........##', '###......###', '.##########.', '.###o##o###.', '.##########.', '..###++###..', '...######...', '....#oo#....', '.....##.....'],
  snake: ['....####....', '...#o####+..', '...##..##...', '....##......', '.....###....', '.......##...', '........##..', '...##..###..', '....#####...', '.....##.....'],
  eagle: ['.....##.....', '....#o##+...', '#...####...#', '##..####..##', '###.####.###', '############', '.##########.', '..########..', '....#..#....', '...##..##...'],
  bull: ['+..........+', '++........++', '.##......##.', '..########..', '..#o####o#..', '..########..', '...######...', '...#+##+#...', '....####....'],
  crow: ['....###.....', '...#o###....', '..+#####....', '.....####...', '....######..', '...#######..', '..########..', '.....#.#....', '....+..+....'],
  spider: ['#..#....#..#', '.#.#....#.#.', '..########..', '.#.######.#.', '#..##oo##..#', '..#.####.#..', '.#..#..#..#.', '#..........#'],
  scorpion: ['.........##.', '..........#.', '.........##.', '...####.##..', '..#o##o###..', '.#######....', '#.#.#.#.#...', '.#.#.#.#....', '#.#...#.#...'],
  skull: ['...######...', '..########..', '.##########.', '.##oo##oo##.', '.##oo##oo##.', '.####..####.', '..########..', '...#.#.#.#..', '...######...'],
  rose: ['....###.....', '...#+##+....', '..##+###+...', '..#+##+##...', '...#####....', '....oo......', '.oo.o..oo...', '..ooo.oo....', '....o.......', '....o.......'],
  hand: ['...#.#.#....', '...#.#.#.#..', '...#.#.#.#..', '...#######..', '#..#######..', '##.#######..', '.#########..', '..#######...', '...#####....', '...#####....'],
  // r29 (crime digital): microchip e robô, no mesmo traço 12×10
  chip: ['.#.#.#.#.#..', '##########..', '#oooooooo#..', '#o++++++o###', '#o+oooo+o#..', '#o+oooo+o###', '#o++++++o#..', '#oooooooo###', '##########..', '.#.#.#.#.#..'],
  bot: ['.....+......', '.....#......', '..########..', '..#o####o#..', '..########..', '..#+#+#+##..', '...######...', '.##########.', '.#.######.#.', '...##..##...'],
};

function drawCharge(p: Px, ch: Charge28, cx: number, cy: number, col: Col, acc: Col): void {
  const g = G[ch];
  if (g) { bmp(p, g, Math.round(cx - g[0].length / 2), Math.round(cy - g.length / 2), { '#': col, '+': acc, o: ch === 'rose' ? C('#48b85c') : shade(col, -0.65) }); return; }
  switch (ch) {
    case 'dagger': p.vline(cx, cy - 6, cy + 1, K.silver); p.vline(cx + 1, cy - 5, cy + 1, K.lgrey); p.hline(cx - 3, cx + 4, cy + 2, acc); p.vline(cx, cy + 3, cy + 5, col); p.vline(cx + 1, cy + 3, cy + 5, col); p.hline(cx - 1, cx + 2, cy + 6, acc); return;
    case 'key': p.ring(cx - 2.5, cy - 3, 2.4, col); p.ring(cx - 2.5, cy - 3, 1.6, col); p.line(cx - 1, cy - 1, cx + 4, cy + 5, col); p.line(cx, cy - 1, cx + 5, cy + 4, col); p.hline(cx + 2, cx + 4, cy + 2, col); p.put(cx + 4, cy + 3, col); return;
    case 'dice': p.rect(cx - 6, cy - 4, 6, 6, K.white); p.rect(cx + 1, cy - 1, 6, 6, K.white); p.put(cx - 5, cy - 3, acc); p.put(cx - 3, cy - 1, acc); p.put(cx - 2, cy, acc); p.put(cx + 2, cy, K.ink); p.put(cx + 5, cy + 3, K.ink); p.put(cx + 3, cy + 1, K.ink); p.put(cx + 4, cy + 2, K.ink); return;
    case 'card': p.rect(cx - 4, cy - 6, 9, 12, K.white); p.disc(cx - 0.5 + 0.5, cy - 0.5, 1.7, K.ink); p.disc(cx + 1.5, cy - 0.5, 1.7, K.ink); p.poly([[cx - 2, cy - 0.5], [cx + 3, cy - 0.5], [cx + 0.5, cy - 4]], K.ink); p.vline(cx, cy + 1, cy + 3, K.ink); p.put(cx - 3, cy - 5, acc); return;
    case 'coin': p.disc(cx + 0.5, cy, 5.5, acc); p.ring(cx + 0.5, cy, 4.2, shade(acc, -0.35)); drawText(p, '$', cx - 1, cy - 2, shade(acc, -0.45)); p.put(cx - 2, cy - 4, K.white); return;
    case 'crown': p.poly([[cx - 6, cy + 3], [cx - 6, cy - 3], [cx - 3, cy], [cx, cy - 5], [cx + 3, cy], [cx + 6, cy - 3], [cx + 6, cy + 3]], acc); p.rect(cx - 6, cy + 3, 13, 2, shade(acc, -0.35)); p.put(cx, cy, K.red); return;
    case 'jukebox': p.disc(cx + 0.5, cy - 2, 5, col); p.rect(cx - 4, cy - 2, 10, 8, col); p.ring(cx + 0.5, cy - 1.5, 4, hsl(330, 85, 60)); p.ring(cx + 0.5, cy - 1.5, 3, hsl(190, 85, 60)); p.rect(cx - 2, cy + 1, 6, 4, K.ink); p.put(cx, cy - 2, acc); return;
    case 'radio': p.rect(cx - 6, cy - 3, 13, 9, col); p.disc(cx - 2, cy + 1.5, 2.6, shade(col, -0.45)); p.rect(cx + 2, cy - 1, 4, 2, acc); p.put(cx + 3, cy + 3, acc); p.put(cx + 5, cy + 3, acc); p.line(cx - 3, cy - 4, cx + 3, cy - 7, K.grey); return;
    case 'cassette': p.rect(cx - 6, cy - 4, 13, 9, col); p.rect(cx - 4, cy - 3, 9, 3, acc); p.disc(cx - 2, cy + 2, 1.3, K.white); p.disc(cx + 3, cy + 2, 1.3, K.white); return;
    case 'record': p.disc(cx + 0.5, cy, 6, K.black); p.ring(cx + 0.5, cy, 4, shade(K.black, 0.25)); p.disc(cx + 0.5, cy, 2, acc); p.put(cx, cy - 1, K.ink); return;
    case 'ticket': p.rect(cx - 6, cy - 3, 13, 7, acc); p.disc(cx - 6, cy + 0.5, 1.2, 0); p.disc(cx + 7, cy + 0.5, 1.2, 0); for (let y = cy - 3; y < cy + 4; y += 2) p.put(cx + 3, y, shade(acc, -0.45)); p.hline(cx - 4, cx + 1, cy, shade(acc, -0.45)); return;
    case 'mask': p.ellipse(cx + 0.5, cy, 7, 4, acc); p.ellipse(cx - 2, cy - 0.5, 1.8, 1.2, K.ink); p.ellipse(cx + 3, cy - 0.5, 1.8, 1.2, K.ink); p.line(cx - 6, cy - 2, cx - 9, cy - 6, col); p.line(cx + 7, cy - 2, cx + 10, cy - 6, col); return;
    case 'accordion': p.rect(cx - 6, cy - 4, 4, 9, col); p.rect(cx + 3, cy - 4, 4, 9, col); for (let x = cx - 2; x < cx + 3; x++) p.vline(x, cy - 4 + (x % 2), cy + 4 - (x % 2), x % 2 ? shade(acc, -0.3) : acc); p.put(cx - 5, cy - 2, K.white); p.put(cx - 4, cy, K.white); p.put(cx - 5, cy + 2, K.white); return;
    case 'mic': p.disc(cx + 0.5, cy - 3, 3, K.lgrey); p.rect(cx - 0, cy, 2, 6, col); p.hline(cx - 1, cx + 2, cy, acc); return;
    case 'money': p.disc(cx + 0.5, cy + 1.5, 5, col); p.poly([[cx - 2, cy - 3], [cx + 3, cy - 3], [cx + 4, cy - 6], [cx - 3, cy - 6]], col); p.hline(cx - 2, cx + 3, cy - 3, acc); drawText(p, '$', cx - 1, cy - 1, acc); return;
  }
}

// ---------------------------------------------------------------- formas

type Mask = (x: number, y: number) => boolean;
type Shape = 'heater' | 'oval' | 'roundel' | 'kamon' | 'diamond' | 'patch' | 'star' | 'coin' | 'stamp' | 'ticket' | 'chip';
function shapeMask(sh: Shape): Mask {
  switch (sh) {
    case 'heater': return (x, y) => x >= 5 && x <= 26 && y >= 3 && (y < 16 || Math.abs(x + 0.5 - 16) <= (27 - y) * 0.95) && y <= 27;
    case 'oval': return (x, y) => ((x + 0.5 - 16) / 10.5) ** 2 + ((y + 0.5 - 15) / 12.5) ** 2 <= 1;
    case 'roundel': case 'coin': case 'kamon': return (x, y) => (x + 0.5 - 16) ** 2 + (y + 0.5 - 15) ** 2 <= 12.8 ** 2;
    case 'diamond': return (x, y) => Math.abs(x + 0.5 - 16) + Math.abs(y + 0.5 - 15) <= 13.5;
    case 'patch': return (x, y) => (x + 0.5 - 16) ** 2 + (y + 0.5 - 15) ** 2 <= 9.5 ** 2;
    case 'star': return (x, y) => { const dx = x + 0.5 - 16, dy = y + 0.5 - 15; const a = Math.atan2(dy, dx); const rr = 9 + 4.5 * Math.max(0, Math.cos(a * 6 + Math.PI / 2)) ** 1.5; return dx * dx + dy * dy <= rr * rr; };
    case 'stamp': return (x, y) => x >= 4 && x <= 27 && y >= 3 && y <= 26 && !((x === 4 || x === 27) && y % 3 === 0) && !((y === 3 || y === 26) && x % 3 === 0);
    case 'ticket': return (x, y) => x >= 2 && x <= 29 && y >= 7 && y <= 23 && (x - 2) ** 2 + (y - 15) ** 2 > 9 && (x - 29) ** 2 + (y - 15) ** 2 > 9;
    // r29: chip (crime digital) — corpo quadrado com pinos nos quatro lados
    case 'chip': return (x, y) => (x >= 7 && x <= 24 && y >= 6 && y <= 23) || ((x === 4 || x === 5 || x === 26 || x === 27) && y >= 8 && y <= 21 && y % 3 === 0) || ((y === 3 || y === 4 || y === 25 || y === 26) && x >= 9 && x <= 22 && x % 3 === 0);
  }
}

type Div = 'plain' | 'pale' | 'fess' | 'bend' | 'quarterly' | 'chevron' | 'chief' | 'bordure' | 'rays';
function divField(div: Div, x: number, y: number, inside: Mask): boolean {
  switch (div) {
    case 'pale': return x >= 16;
    case 'fess': return y >= 15;
    case 'bend': return x - 5 > y;
    case 'quarterly': return (x >= 16) !== (y >= 15);
    case 'chevron': return y > 24 - Math.abs(x + 0.5 - 16) * 0.9 && y < 28 - Math.abs(x + 0.5 - 16) * 0.9;
    case 'chief': return y < 9;
    case 'bordure': return !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2);
    case 'rays': return Math.floor(((Math.atan2(y + 0.5 - 15, x + 0.5 - 16) + Math.PI) / Math.PI) * 8) % 2 === 0;
  }
  return false;
}

// ---------------------------------------------------------------- composição

const RACKET_CHARGE: Record<string, Charge28[]> = {
  jukebox: ['jukebox', 'coin'], clubs: ['card', 'dice', 'key'], payola: ['radio', 'coin'], bootleg: ['cassette', 'record'], tickets: ['ticket'],
  protection: ['hand', 'key'], laundering: ['money', 'coin'], violence: ['dagger', 'skull'], carnival: ['mask'], corridos: ['accordion', 'rose'],
};
const KIND_CHARGE: Record<EmblemKind28, Charge28[]> = {
  mafia: ['hand', 'rose', 'dagger', 'eagle', 'card', 'wolf'], firm: ['bull', 'crow', 'dagger', 'key', 'dice'], syndicate: ['snake', 'spider', 'crow', 'wolf', 'eagle', 'key'],
  cartel: ['scorpion', 'eagle', 'skull', 'rose', 'wolf', 'coin'], gang: ['skull', 'wolf', 'crow', 'dagger', 'spider', 'dice'],
  bootleg: ['cassette', 'record', 'skull'], payola: ['radio', 'coin', 'money'], ghost: ['mask', 'ticket'], lipsync: ['mic'], aivoice: ['mic'], fraud: ['mask', 'card', 'coin'],
  cyber: ['chip', 'bot', 'skull', 'spider'],
};

/** Escolhas puras do brasão (forma, divisão, carga, cores) — testável sem desenhar. */
export function emblemModel28(sp: EmblemSpec28): { shape: Shape; div: Div; charge: Charge28; crown: boolean; ribbon: boolean } {
  const r = rng28('emb', sp.id, sp.kind);
  const shape: Shape = sp.kind === 'mafia' ? r.pick(['heater', 'heater', 'oval'] as const)
    : sp.kind === 'firm' ? r.pick(['roundel', 'heater'] as const)
    : sp.kind === 'syndicate' ? (sp.a3 === 'JPN' ? 'kamon' : sp.a3 === 'HKG' || sp.a3 === 'CHN' || sp.a3 === 'TWN' ? 'diamond' : r.pick(['oval', 'diamond'] as const))
    : sp.kind === 'cartel' ? r.pick(['star', 'diamond'] as const)
    : sp.kind === 'gang' ? 'patch'
    : sp.kind === 'payola' ? 'coin' : sp.kind === 'ghost' ? 'ticket' : sp.kind === 'cyber' ? 'chip' : 'stamp';
  const div: Div = shape === 'patch' || shape === 'coin' || shape === 'kamon' || shape === 'chip' ? 'plain' : shape === 'star' ? r.pick(['plain', 'rays'] as const) : r.pick(['plain', 'pale', 'fess', 'bend', 'quarterly', 'chevron', 'chief', 'bordure'] as const);
  const scheme = !['mafia', 'gang', 'cartel', 'syndicate', 'firm'].includes(sp.kind);
  const rk = scheme ? [] : (sp.rackets ?? []).flatMap((x) => RACKET_CHARGE[x] ?? []);
  const charge = rk.length && r.chance(0.55) ? r.pick(rk) : r.pick(KIND_CHARGE[sp.kind]);
  return { shape, div, charge, crown: sp.kind === 'mafia' && r.chance(0.5), ribbon: shape !== 'patch' && shape !== 'ticket' && r.chance(0.6) };
}

const inits = (name?: string): string => {
  const w = (name ?? '').replace(/["'“”]/g, '').split(/[\s\-]+/).filter((x) => x.length > 2 && !/^(the|dos|das|del|de|da|do|la|los|família|family|a|o)$/i.test(x));
  return fitText((w.length >= 2 ? w[0][0] + w[1][0] : (w[0] ?? 'XX').slice(0, 2)).toUpperCase(), 12);
};

/** Pinta o emblema 32×32 (com contorno). Mesmo spec → mesmos pixels. */
export function emblemPx28(sp: EmblemSpec28): Px {
  const N = 32;
  const p = new Px(N, N);
  const r = rng28('emb-c', sp.id, sp.kind);
  const md = emblemModel28(sp);
  const tc = tinctures(sp, r);
  const { a, b } = tc;
  const m = sp.kind === 'payola' ? K.gold : tc.m;
  const inside = shapeMask(md.shape);
  layer(p, (q) => {
    if (md.shape === 'patch') { // emblema de colete: faixas curvas (rockers) + disco central
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 15);
        if (d <= 9.5) q.put(x, y, a);
        else if (d >= 11 && d <= 15 && (y < 9 || y > 21)) q.put(x, y, b);
      }
      const t = inits(sp.name);
      drawText(q, t, 16 - Math.round(textWidth(t) / 2), 1, m); for (const x of [11, 16, 21]) { q.put(x, 27, m); q.put(x - 1, 27, m); q.put(x, 26, m); q.put(x, 28, m); }
      return;
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!inside(x, y)) continue;
      const alt = divField(md.div, x, y, inside);
      let c = alt ? b : a;
      if (md.shape === 'stamp' || md.shape === 'ticket') c = dith(x, y, 0.15) ? shade(K.paper, -0.08) : K.paper;
      if (md.shape === 'coin') c = (x + y) % 2 && ((x + 0.5 - 16) ** 2 + (y + 0.5 - 15) ** 2 > 11.6 ** 2) ? shade(m, -0.3) : m;
      q.put(x, y, c);
    }
    if (md.shape === 'kamon') { q.ring(16, 15, 11, m); q.ring(16, 15, 10.4, m); }
    if (md.shape === 'stamp') { q.ring(16, 14.5, 9.5, withAlpha(K.dred, 220)); q.ring(16, 14.5, 8.8, withAlpha(K.dred, 200)); }
    // brilho na borda superior esquerda
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inside(x, y) && (!inside(x - 1, y) || !inside(x, y - 1))) q.set(x, y, withAlpha(K.white, 70));
  });
  // carga
  const field = md.shape === 'coin' ? m : a;
  const lightField = (field & 0xff) + ((field >> 8) & 0xff) + ((field >> 16) & 0xff) > 420;
  const chCol = md.shape === 'stamp' || md.shape === 'ticket' ? K.dred : md.shape === 'coin' ? shade(m, -0.55) : lightField ? K.ink : m;
  const chAcc = md.shape === 'coin' ? K.lgold : md.shape === 'stamp' || md.shape === 'ticket' ? K.gold : md.charge === 'coin' || md.charge === 'crown' || md.charge === 'ticket' ? K.gold : K.red;
  layer(p, (q) => drawCharge(q, md.charge, 16, md.shape === 'patch' ? 15 : 14, chCol, chAcc), shade(field, -0.6));
  if (md.shape === 'kamon' || md.shape === 'diamond') for (const [x, y] of [[16, 4], [16, 25], [5, 15], [26, 15]] as const) p.put(x, y, m);
  // golpes: carimbo cruzado
  if (sp.kind === 'lipsync' || sp.kind === 'aivoice') { p.line(9, 7, 23, 21, K.red); p.line(10, 7, 24, 21, K.red); if (sp.kind === 'aivoice') for (let x = 8; x < 24; x += 3) p.put(x, 24, K.teal); }
  if (sp.kind === 'cyber') for (let i = 0; i < 4; i++) { p.hline(8, 11 + i * 3, 9 + i * 4, K.teal); p.put(11 + i * 3, 9 + i * 4, K.white); } // r29: trilhas de circuito
  if (sp.kind === 'ghost' || sp.kind === 'fraud') drawText(p, 'FAKE', 9, sp.kind === 'ghost' ? 18 : 22, withAlpha(K.dred, 230));
  // coroa e fita
  if (md.crown) layer(p, (q) => drawCharge(q, 'crown', 16, 1, m, m));
  if (md.ribbon) {
    layer(p, (q) => {
      q.poly([[3, 25], [29, 25], [28, 31], [4, 31]], K.cream); q.poly([[0, 26], [4, 25], [4, 31], [1, 30]], shade(K.cream, -0.25)); q.poly([[32, 26], [28, 25], [28, 31], [31, 30]], shade(K.cream, -0.25));
      const tt = inits(sp.name);
      drawText(q, tt, 16 - Math.round(textWidth(tt) / 2), 26, b === K.paper ? K.ink : shade(b, -0.2));
    });
  }
  p.outline(OUT28);
  return p;
}

/** <img> do emblema (memorizado). */
export function emblemImg28(sp: EmblemSpec28, size = 32, title?: string): HTMLImageElement {
  return pxImg28(`em:${sp.kind}:${sp.id}:${sp.a3 ?? ''}:${(sp.rackets ?? []).join(',')}`, () => emblemPx28(sp), size, size, { cls: 'emblem28', title });
}

/** Tipo de emblema de uma organização do crime17 (OrgKind17). */
export const orgEmblemKind28 = (k: string): EmblemKind28 => (EMBLEM_KINDS28 as string[]).includes(k) ? (k as EmblemKind28) : 'gang';
