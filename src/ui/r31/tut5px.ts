// R31 · onda 5 (TUT, EXP-12) — ARTE do tutorial guiado, desenhada por código como o resto (px.ts + avatar.ts):
// o MENTOR DA ÉPOCA (boneco do jogo com a roupa e os acessórios da época), a moldura do balão em pixel art e o
// DIPLOMA do fim. Só desenha; quem decide o que aparece é tut5ui.ts. Sem canvas (testes), devolve canvas vazio.

import { l, type L } from '../../data/world';
import type { Appearance } from '../../sim/types';
import { avatarSprite } from '../pixel/avatar';
import { C, INK, Px, discV, inked, lv, rectV, withAlpha, type Col } from '../pixel/px';
import { paper5Px } from '../pixel/exp5paper';

/** Mentor de cada época (o guia aceito pelo dono: "mentor da época"). */
export interface Mentor5 { era: [number, number]; name: string; role: L; look: Appearance; phone: L }
const look = (o: Partial<Appearance>): Appearance => ({ body: 1, face: 1, skin: 1, hair: 4, hairColor: 6, outfit: 1, outfitColor: 6, glasses: false, hat: false, beard: false, ...o });
export const MENTORS5: Mentor5[] = [
  { era: [1889, 1919], name: 'Seu Bento Arruda', role: l('editor de partituras veterano', 'veteran sheet-music publisher'), look: look({ hair: 2, hairColor: 6, outfit: 1, outfitColor: 6, beard: true, bdT: 1, hat: true, hatT: 1 }), phone: l('telegrama', 'telegram') },
  { era: [1920, 1949], name: 'Dona Celeste Moraes', role: l('empresária veterana do rádio', 'veteran radio impresario'), look: look({ body: 0, face: 2, skin: 2, hair: 9, hairColor: 1, outfit: 2, outfitColor: 1, hat: true, hatT: 7 }), phone: l('telefone de disco', 'rotary phone') },
  { era: [1950, 1969], name: 'Walter "Agulha" Lins', role: l('produtor e disc-jóquei', 'producer and disc jockey'), look: look({ skin: 0, hair: 6, hairColor: 0, outfit: 1, outfitColor: 0, glasses: true, glT: 1 }), phone: l('telefone de mesa', 'desk phone') },
  { era: [1970, 1989], name: 'Rita Fagundes', role: l('produtora de estúdio', 'studio producer'), look: look({ body: 0, face: 0, skin: 3, hair: 12, hairColor: 0, outfit: 3, outfitColor: 4, glasses: true, glT: 2 }), phone: l('telefone com fio', 'corded phone') },
  { era: [1990, 2009], name: 'Marcos Tavares', role: l('diretor artístico de gravadora', 'label A&R director'), look: look({ skin: 1, hair: 3, hairColor: 2, outfit: 1, outfitColor: 6, beard: true, bdT: 2 }), phone: l('celular', 'cell phone') },
  { era: [2010, 2040], name: 'Júlia Okada', role: l('produtora e empresária de artistas', 'producer and artist manager'), look: look({ body: 0, face: 1, skin: 0, hair: 10, hairColor: 7, outfit: 0, outfitColor: 2 }), phone: l('celular', 'smartphone') },
];
export const mentor5 = (year: number): Mentor5 => MENTORS5.find((m) => year >= m.era[0] && year <= m.era[1]) ?? MENTORS5[MENTORS5.length - 1];

const blank = (w = 1, h = 1): HTMLCanvasElement => { const c = typeof document !== 'undefined' ? document.createElement('canvas') : ({ width: w, height: h, getContext: () => null } as unknown as HTMLCanvasElement); c.width = w; c.height = h; return c; };
const scaled = (src: HTMLCanvasElement, z: number): HTMLCanvasElement => {
  const c = blank(src.width * z, src.height * z);
  const g = c.getContext('2d');
  if (g) { g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, c.width, c.height); }
  return c;
};

/** O mentor de pé (de frente para o jogador), ampliado `z` vezes. */
export function mentorCanvas5(year: number, z = 3, frame = 0): HTMLCanvasElement {
  try { return scaled(avatarSprite(mentor5(year).look, { year, pose: 'stand', dir: 'SE', frame }).c, z); } catch { return blank(); }
}

/** Cores do papel por época (o balão e o diploma acompanham o estilo da interface). */
function paperCols(year: number): { paper: Col; edge: Col; ink: Col; seal: Col; ribbon: Col } {
  if (year < 1950) return { paper: C('#efe2c0'), edge: C('#b8955a'), ink: C('#3a2414'), seal: C('#9a2a24'), ribbon: C('#1f4d7a') };
  if (year < 1990) return { paper: C('#f4ecd8'), edge: C('#c98a3a'), ink: C('#2a1c18'), seal: C('#c0392b'), ribbon: C('#2e7d5b') };
  return { paper: C('#f3f1ea'), edge: C('#5a6b8a'), ink: C('#1c2030'), seal: C('#d4a020'), ribbon: C('#3b4fa8') };
}

/** Balão no estilo dos papéis da onda 5 (exp5paper): ficha creme com margem vermelha e pauta azul clara, contorno
 *  escuro quente (INK) de 1 px, sombra no chão e o rabicho apontando para o mentor. */
export function bubblePx5(w: number, h: number, year: number, tail: 'left' | 'right' = 'left'): Px {
  const W = Math.max(40, Math.round(w)), H = Math.max(24, Math.round(h));
  const p = new Px(W + 3, H + 9);
  const paper = year < 1950 ? C('#f3e8cc') : C('#fbf6e8');
  inked(p, (q) => {
    q.rect(1, 1, W - 2, H - 2, paper);
    q.hline(1, W - 2, 1, lv(paper, 4.6)); // luz de cima
    q.hline(1, W - 2, H - 2, lv(paper, 2.2)); // pé do papel
    const tx = tail === 'left' ? 10 : W - 20;
    q.poly([[tx, H - 2], [tx + 10, H - 2], [tail === 'left' ? tx - 2 : tx + 12, H + 6]], paper);
  });
  // margem vermelha e pauta (como a ficha do fichário)
  p.vline(7, 3, H - 4, C('#e0908a'));
  for (let y = 9; y < H - 3; y += 6) p.hline(9, W - 4, y, C('#dce4f0'));
  // sombra no chão (luz de cima à esquerda)
  for (let y = 3; y < H + 1; y++) if (!p.get(W, y)) p.set(W, y, withAlpha(INK, 70));
  for (let x = 3; x < W + 1; x++) if (!p.get(x, H)) p.set(x, H, withAlpha(INK, 70));
  return p;
}

/** Diploma: o papel "ficha" da onda 5 (paper5Px) com a faixa do título e o selo com fita em volume (luz de cima à esquerda). */
export function diplomaPx5(year: number, W = 200, H = 136): Px {
  const k = paperCols(year);
  const p = paper5Px('form', W, H, { seed: 31 });
  const w = p.w, hh = p.h;
  // filete duplo da época por dentro do papel
  p.hline(10, w - 11, 12, k.edge); p.hline(10, w - 11, hh - 13, k.edge); p.vline(10, 12, hh - 13, k.edge); p.vline(w - 11, 12, hh - 13, k.edge);
  // faixa do título (pano com volume e pontas cortadas)
  inked(p, (q) => {
    rectV(q, 30, 24, w - 60, 13, k.ribbon);
    q.poly([[20, 27], [30, 27], [30, 40], [25, 37], [20, 40]], lv(k.ribbon, 1.6));
    q.poly([[w - 30, 27], [w - 20, 27], [w - 20, 40], [w - 25, 37], [w - 30, 40]], lv(k.ribbon, 1.6));
  });
  // linhas de assinatura
  p.hline(26, 84, hh - 28, k.ink); p.hline(w - 84, w - 26, hh - 28, k.ink);
  // selo de lacre com fita e um disco no meio
  const sx = Math.round(w / 2), sy = hh - 32;
  inked(p, (q) => {
    q.poly([[sx - 9, sy + 4], [sx - 3, sy + 4], [sx - 6, sy + 22], [sx - 9, sy + 18], [sx - 13, sy + 20]], k.ribbon);
    q.poly([[sx + 3, sy + 4], [sx + 9, sy + 4], [sx + 13, sy + 20], [sx + 9, sy + 18], [sx + 6, sy + 22]], lv(k.ribbon, 1.6));
    discV(q, sx, sy, 10, k.seal, { spec: true });
  });
  discV(p, sx, sy, 4, INK);
  p.set(sx, sy, k.paper);
  return p;
}

/** Telefone do mentor (ícone do botão "Ligar para…"), com a forma da época. */
export function phonePx5(year: number): Px {
  const p = new Px(16, 14);
  const body = year < 1970 ? C('#2a2226') : year < 2000 ? C('#c83a32') : C('#3a3e48');
  inked(p, (q) => {
    if (year < 1990) { rectV(q, 2, 6, 12, 7, body); q.rect(1, 2, 14, 3, body); discV(q, 8, 9, 2, C('#d8d0c0')); }
    else { rectV(q, 5, 1, 7, 12, body); q.rect(6, 2, 5, 7, C('#7ac0e0')); q.set(8, 11, C('#d8d0c0')); }
  });
  return p;
}
export function phoneCanvas5(year: number, z = 2): HTMLCanvasElement {
  try { return scaled(phonePx5(year).canvas(), z); } catch { return blank(); }
}

export function diplomaCanvas5(year: number, z = 3): HTMLCanvasElement {
  try { return scaled(diplomaPx5(year).canvas(), z); } catch { return blank(); }
}
export function bubbleCanvas5(w: number, h: number, year: number, tail: 'left' | 'right' = 'left', z = 2): HTMLCanvasElement {
  try { return scaled(bubblePx5(w, h, year, tail).canvas(), z); } catch { return blank(); }
}
