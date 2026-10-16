// R31 · onda 4 (FOS) — PINTURA da casa da família Fossati e da praça Efro e Lucia Fossati, no pixel art antigo do jogo:
// mesma moldura, grade e escala dos interiores (interior27/hqpx27: céu, vizinhos, rua, parede da época, lâmpadas,
// contorno escuro quente de 1 px, 2–3 tons por material). Tudo procedural e semeado; nada vai para o save.
// O modelo (ui/r31/fos31model.ts) diz o que existe e onde; aqui só se desenha.

import { C, INK, Px, lv, mix, tint, withAlpha, type Col } from './px';
import { eraOf, paletteOf } from './palette';
import { avatarSprite, lookOf, type Pose } from './avatar';
import { ageLook } from './age17';
import { gearOf27, lightOf27, prim27, type Ctx27, type Plan27 } from '../ps/hqpx27';
import { geom27 } from './interior27';
import type { Appearance } from '../../sim/types';
import type { FosM31, FosObj31, FosWho31 } from '../r31/fos31model';
import { FAM_LOOK31 } from '../r31/fos31model';

const RH = 92, STREET = 16, FOUND = 4, OW = 6;
const OCC = C('#2a1634');
const hs = (str: string): number => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0; return x; };

/** Visual de quem aparece: os quatro têm aparência própria (idade fixa); os outros, o visual do jogo. */
export function fosLook31(p: FosWho31, real?: (id: string) => Appearance | undefined): Appearance {
  if (p.fam) {
    const b = FAM_LOOK31[p.fam];
    const a = ageLook({ ...b } as Appearance, p.look.age ?? 40, p.look.id, b.sx);
    return p.fam === 'efro' ? { ...a, body: b.body } : p.fam === 'lucia' ? { ...a, body: b.body, gy: Math.min(a.gy ?? 0, 4) } : { ...a, body: b.body, gy: 0 }; // Lucia castanho-grisalha; as filhas pintam o cabelo
  }
  return real?.(p.look.id) ?? lookOf({ id: p.look.id });
}

function ctxFor(W: number, year: number, seed: number, dim: boolean, open = false): { g: Ctx27; pl: Plan27; x0: number; w0: number; y0: number; fy: number; gy: number; bx: number; bw: number; top: number } {
  const H = 150, gy = H - STREET, bx = open ? Math.round(W * 0.08) : 12, bw = open ? W - 2 * Math.round(W * 0.08) : W - 24, y0 = gy - FOUND - RH, x0 = bx + OW, w0 = bw - 2 * OW, top = y0 - 14;
  const cell = { kind: 'lounge' as Plan27['cells'][number]['kind'], floor: 0, x: x0, y: y0, w: w0, h: RH };
  const pl = { hq: 1, year, shell: 'shop', gear: gearOf27(year), light: dim ? (year < 1960 ? 'bulb' : lightOf27('shop', year)) : lightOf27('shop', year), era: eraOf(year), facade: 'block',
    W, H, gy, bx, bw, top, floors: 1, cells: [cell], rooms: [], city: '', lms: [], brand: '', seed, flock: {}, vip: null, crown: null } as unknown as Plan27;
  const p = new Px(W, H);
  const pal = paletteOf(year);
  const g: Ctx27 = { p, pal, pl, r: prim27.rng27(seed), lamp: pl.light === 'tube' ? C('#e8f4ff') : pl.light === 'led' ? mix(C('#ffffff'), pal.accent, 0.25) : pl.light === 'globe' ? C('#ffc070') : C('#ffd889') };
  return { g, pl, x0, w0, y0, fy: y0 + RH - 3, gy, bx, bw, top };
}

// ---------------------------------------------------------------- objetos da casa

function homeObj(g: Ctx27, o: FosObj31, m: FosM31, fy: number): void {
  const { p, pal } = g;
  const { blk } = prim27;
  const { x, y, w, h } = o;
  const year = m.year;
  switch (o.kind) {
    case 'stove': {
      // fogão (a lenha antes de 1930, esmaltado depois) com a forma de lasanha em cima
      const body = year < 1930 ? C('#3a3436') : year < 1980 ? C('#e8e2d4') : C('#c8ccd2');
      blk(p, x, y + 4, w, h - 4, body);
      p.rect(x + 2, y + 10, w - 4, h - 14, lv(body, year < 1930 ? 3 : 1.6)); // porta do forno
      p.rect(x + 4, y + 12, w - 8, 2, lv(body, 0.8));
      for (let i = 0; i < 3; i++) p.rect(x + 3 + i * Math.floor((w - 6) / 3), y + 5, 3, 1, C('#d8b040')); // botões
      if (year < 1930) p.rect(x + w - 5, y - 10, 3, 14, C('#2a2426')); // chaminé
      blk(p, x + 4, y, w - 10, 4, C('#b85a2a')); // forma
      p.hline(x + 5, x + w - 8, y, C('#f0c060')); p.put(x + 7, y + 1, C('#c8302c')); p.put(x + 11, y + 1, C('#c8302c')); // queijo e molho
      p.rect(x + 6, y - 4, 1, 3, withAlpha(C('#ffffff'), 90)); p.rect(x + 10, y - 5, 1, 3, withAlpha(C('#ffffff'), 70)); // vapor
      break;
    }
    case 'cupboard': {
      blk(p, x, y, w, h, pal.wood);
      p.vline(x + (w >> 1), y + 1, y + h - 2, pal.woodDark);
      p.put(x + (w >> 1) - 2, y + (h >> 1), pal.gold); p.put(x + (w >> 1) + 2, y + (h >> 1), pal.gold);
      for (let i = 0; i < 3; i++) p.rect(x + 3 + i * 5, y - 4, 3, 4, [C('#e8e0d0'), C('#c8a040'), C('#7a9ab8')][i]); // potes
      break;
    }
    case 'table': {
      // mesa comprida com toalha xadrez, pratos, a travessa de macarrão e cadeiras
      const top = fy - 12;
      for (let xx = x; xx < x + w; xx++) for (let yy = top; yy < top + 4; yy++) p.put(xx, yy, ((xx >> 1) + (yy >> 1)) % 2 ? C('#e8e0d0') : C('#c8302c'));
      p.hline(x, x + w - 1, top, C('#f4ecdc'));
      p.vline(x + 2, top + 4, fy - 1, pal.woodDark); p.vline(x + w - 3, top + 4, fy - 1, pal.woodDark);
      for (let i = 0; i < 4; i++) { const px0 = x + 5 + Math.round(((w - 14) * i) / 3); p.rect(px0, top - 1, 5, 1, C('#f8f4ec')); }
      p.ellipse(x + (w >> 1), top - 2, 5, 2, C('#f0e8d8')); p.rect(x + (w >> 1) - 3, top - 4, 7, 2, C('#e8b040')); p.put(x + (w >> 1), top - 4, C('#c8302c'));
      p.rect(x + w - 10, top - 6, 2, 5, C('#5a2a3a')); // vinho
      prim27.chair(g, x - 6, fy); prim27.chair(g, x + w - 2, fy);
      break;
    }
    case 'trophies': {
      blk(p, x, y + h - 3, w, 3, pal.woodDark); // prateleira
      const n = 4;
      for (let i = 0; i < n; i++) {
        const cx = x + 4 + Math.round(((w - 10) * i) / (n - 1)), tall = 7 + ((i * 3) % 4);
        const metal = i === 1 ? C('#d8dce4') : C('#e8c45a');
        p.rect(cx - 1, y + h - 5, 4, 2, pal.woodDark); p.rect(cx, y + h - 5 - tall + 3, 2, tall - 3, metal); p.rect(cx - 2, y + h - 5 - tall, 6, 3, metal);
        p.put(cx - 3, y + h - 4 - tall, metal); p.put(cx + 4, y + h - 4 - tall, metal); p.put(cx - 1, y + h - 5 - tall, tint(metal, 0.4));
      }
      p.rect(x + w - 7, y + 1, 6, 6, C('#d8e060')); p.put(x + w - 5, y + 3, C('#f8f8e0')); // bola de tênis
      break;
    }
    case 'window': prim27.backWindow(g, x, y, w, h, year < 1930); break;
    case 'vitrine': {
      // vitrine de madeira e vidro: o violino na prateleira (roubado = lugar vazio, só o contorno no veludo)
      blk(p, x, y, w, h, pal.woodDark);
      p.rect(x + 2, y + 3, w - 4, h - 14, C('#6a1a24')); // veludo
      p.rect(x + 2, y + 3, w - 4, h - 14, withAlpha(C('#bfe0f0'), 40)); // vidro
      p.vline(x + 3, y + 4, y + h - 13, withAlpha(C('#ffffff'), 120));
      p.rect(x + 1, y + h - 11, w - 2, 2, tint(pal.wood, 0.2)); p.rect(x + 2, y + h - 8, w - 4, 6, pal.wood); p.put(x + (w >> 1), y + h - 5, pal.gold);
      const cx = x + (w >> 1), cy = y + 6;
      if (m.violin === 'in') {
        const wood = C('#a0521e');
        p.ellipse(cx, cy + 17, 4, 4, wood); p.ellipse(cx, cy + 10, 3, 3, wood); p.rect(cx - 2, cy + 12, 5, 3, wood); // corpo
        p.rect(cx, cy + 1, 1, 9, C('#2a1a12')); p.rect(cx - 1, cy, 3, 2, wood); // braço e voluta
        p.put(cx - 1, cy + 15, INK); p.put(cx + 1, cy + 15, INK); // efes
        p.vline(cx, cy + 9, cy + 20, C('#e8e0c8')); // cordas
        p.put(cx - 2, cy + 9, tint(wood, 0.4));
        p.line(cx + 4, cy + 4, cx - 3, cy + 22, C('#c8b890')); // arco
      } else if (m.violin === 'stolen') {
        // lugar vazio: a marca do violino no veludo e o suporte sem nada
        const ghost = C('#a85a64');
        for (let a = 0; a < 16; a += 2) { const t = (a / 16) * Math.PI * 2; p.put(Math.round(cx + Math.cos(t) * 4), Math.round(cy + 17 + Math.sin(t) * 4), ghost); p.put(Math.round(cx + Math.cos(t) * 3), Math.round(cy + 10 + Math.sin(t) * 3), ghost); }
        for (let yy = cy + 1; yy < cy + 8; yy += 2) p.put(cx, yy, ghost); // contorno tracejado do que não está lá
        p.rect(cx - 3, cy + 22, 7, 1, C('#c8c0b0')); p.rect(cx - 3, cy + 21, 1, 1, C('#c8c0b0')); p.rect(cx + 3, cy + 21, 1, 1, C('#c8c0b0')); // suporte vazio
      }
      break;
    }
    case 'plane': {
      // foto do avião numa moldura e, a partir do aeroclube, a maquete pendurada; antes, um papagaio de papel
      if (o.v === 'kite') {
        p.poly([[x + 10, y], [x + 16, y + 7], [x + 10, y + 16], [x + 4, y + 7]], C('#d8b040'));
        p.line(x + 10, y, x + 10, y + 16, C('#8a3a2a')); p.line(x + 4, y + 7, x + 16, y + 7, C('#8a3a2a'));
        p.line(x + 10, y + 16, x + 14, y + 22, C('#e8e0d0'));
        break;
      }
      blk(p, x, y + 2, 18, 14, pal.woodDark); p.rect(x + 2, y + 4, 14, 10, year < 1960 ? C('#c8bca0') : C('#8ab8d8'));
      const ink = year < 1960 ? C('#4a3a2a') : C('#2a2a3a');
      p.rect(x + 4, y + 9, 10, 2, ink); p.rect(x + 7, y + 7, 3, 6, ink); p.rect(x + 13, y + 7, 1, 3, ink); // avião na foto
      // maquete pendurada (biplano até 1940; depois monomotor)
      const mx = x + w - 14, my = y + 8;
      p.vline(mx + 6, y - 8, my - 1, C('#9a9aa2'));
      const body = C('#c8302c');
      p.rect(mx, my + 2, 13, 3, body); p.rect(mx + 12, my + 1, 2, 2, body); // fuselagem e leme
      p.rect(mx + 3, my, 7, 1, C('#e8e0d0')); if (year < 1940) p.rect(mx + 3, my + 6, 7, 1, C('#e8e0d0'));
      p.vline(mx - 1, my + 1, my + 5, C('#3a3a40'));
      break;
    }
    case 'sdesk': {
      // mesa de trabalho da Sonia: rádio/microfone até 2020, telefone e pasta de contratos depois; aposentada, vaso e regador
      prim27.desk(g, x, fy, w);
      const top = fy - 12;
      const retired = m.year >= 2036;
      if (retired) { prim27.plant(g, x + 6, top, false); p.rect(x + w - 12, top - 4, 7, 4, C('#5a8a5a')); p.rect(x + w - 6, top - 6, 3, 1, C('#5a8a5a')); }
      else if (m.year < 2021) {
        if (m.year < 1922) { p.rect(x + 3, top - 6, 8, 6, C('#f0e8d0')); for (let i = 0; i < 3; i++) p.hline(x + 4, x + 9, top - 5 + i * 2, C('#4a4a4a')); } // jornal
        else { blk(p, x + 3, top - 7, 10, 7, pal.woodDark); p.disc(x + 7, top - 4, 2, C('#e8d8a8')); p.rect(x + 14, top - 10, 1, 10, C('#3a3a40')); p.rect(x + 13, top - 13, 3, 4, C('#9a9aa2')); } // rádio e microfone
        p.rect(x + w - 10, top - 3, 7, 3, C('#c83a3a')); p.rect(x + w - 9, top - 4, 5, 1, C('#e8e0d0')); // cartazes da promoção
      } else {
        p.rect(x + 3, top - 3, 9, 3, C('#2a3a6a')); p.rect(x + 4, top - 4, 7, 1, C('#f0e8d0')); // pasta de contratos
        p.rect(x + w - 10, top - 4, 6, 4, C('#2a2a30')); p.rect(x + w - 9, top - 3, 4, 2, C('#7ab0e0')); // telefone
      }
      prim27.chair(g, x + w - 6, fy);
      break;
    }
    case 'theatre': {
      // cartaz de teatro (até 1996)
      blk(p, x, y, w, h, C('#2a1a2a'));
      p.rect(x + 2, y + 2, w - 4, 4, C('#d8b040'));
      p.ellipse(x + (w >> 1) - 3, y + 12, 3, 4, C('#f0e8d8')); p.ellipse(x + (w >> 1) + 3, y + 13, 3, 4, C('#d8b040')); // máscaras
      p.put(x + (w >> 1) - 4, y + 11, INK); p.put(x + (w >> 1) - 2, y + 11, INK); p.put(x + (w >> 1) + 2, y + 12, INK); p.put(x + (w >> 1) + 4, y + 12, INK);
      p.rect(x + 2, y + h - 5, w - 4, 1, C('#e8e0d0')); p.rect(x + 2, y + h - 3, w - 6, 1, C('#e8e0d0'));
      break;
    }
    case 'typedesk': {
      prim27.desk(g, x, fy, w);
      const top = fy - 12;
      if (m.year < 1990) { blk(p, x + 4, top - 6, 12, 6, C('#3a3a3e')); p.rect(x + 6, top - 9, 8, 3, C('#f0e8d0')); }
      else { blk(p, x + 4, top - 10, 12, 9, C('#d8d4c8')); p.rect(x + 5, top - 9, 10, 6, C('#3a6a9a')); }
      p.rect(x + w - 10, top - 2, 7, 2, C('#e8e0d0')); p.rect(x + w - 9, top - 3, 5, 1, C('#c8c0b0')); // jornais
      break;
    }
    case 'blackboard': {
      // lousa da escola de idiomas (1997+)
      blk(p, x, y, w, h, pal.woodDark); p.rect(x + 2, y + 2, w - 4, h - 6, C('#2a4a3a'));
      const chalk = C('#e8ecd8');
      const words = [6, 9, 5, 8];
      for (let i = 0; i < words.length; i++) p.rect(x + 4 + (i % 2) * 4, y + 5 + i * 5, Math.min(w - 10, words[i] * 2), 1, chalk);
      p.rect(x + w - 10, y + 4, 6, 4, C('#c8302c')); p.rect(x + w - 10, y + 6, 6, 1, C('#f0f0f0')); // bandeirinha
      p.rect(x + 4, y + h - 4, w - 8, 1, pal.wood); p.rect(x + 6, y + h - 5, 3, 1, chalk);
      break;
    }
    case 'lectern': { blk(p, x, y + 4, w, h - 4, pal.wood); p.rect(x - 1, y + 2, w + 2, 3, tint(pal.wood, 0.3)); p.rect(x + 2, y, 6, 2, C('#f0e8d0')); break; }
    case 'bench': {
      // bancada da Metalmac: morsa, engrenagens e a peça da época
      blk(p, x, fy - 12, w, 3, C('#6a6a72')); p.vline(x + 2, fy - 9, fy - 1, C('#4a4a52')); p.vline(x + w - 3, fy - 9, fy - 1, C('#4a4a52'));
      blk(p, x + 3, fy - 17, 7, 5, C('#3a5a8a')); p.rect(x + 1, fy - 16, 2, 1, C('#9a9aa2')); // morsa
      const gear = (cx: number, cy: number, r: number) => { p.disc(cx, cy, r, C('#9a9aa2')); for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2; p.put(Math.round(cx + Math.cos(t) * (r + 1)), Math.round(cy + Math.sin(t) * (r + 1)), C('#9a9aa2')); } p.disc(cx, cy, 1, C('#4a4a52')); };
      gear(x + 15, fy - 16, 3); gear(x + 22, fy - 15, 2);
      const pc = x + w - 14;
      switch (o.v) {
        case 'cyl': blk(p, pc, fy - 20, 8, 8, C('#6a4a2a')); p.vline(pc + 2, fy - 19, fy - 13, C('#c89a5a')); break; // molde de cilindro
        case '78': p.disc(pc + 5, fy - 16, 4, C('#2a2020')); p.put(pc + 5, fy - 16, C('#c8302c')); break; // disco de 78
        case 'lp': p.disc(pc + 5, fy - 17, 5, C('#1e1e24')); p.disc(pc + 5, fy - 17, 1.5, C('#e8b040')); break;
        case 'cd': p.disc(pc + 5, fy - 16, 4, C('#d8dce4')); p.disc(pc + 5, fy - 16, 1, C('#8ab8d8')); p.put(pc + 3, fy - 18, C('#ffffff')); break;
        default: p.disc(pc + 5, fy - 17, 5, C('#1e1e24')); p.disc(pc + 5, fy - 17, 1.5, C('#c8302c')); p.rect(pc - 2, fy - 22, 4, 10, C('#5a6a7a')); break; // vinil e a prensa nova
      }
      blk(p, x + w - 8, fy - 8, 7, 7, C('#8a6a3a')); // caixa de peças
      break;
    }
    case 'mmsign': {
      blk(p, x, y, w, h, C('#2a3a5a'));
      // "MM" em blocos
      const ink = C('#e8e0c8');
      for (const ox of [3, 10]) { p.vline(x + ox, y + 2, y + h - 3, ink); p.vline(x + ox + 4, y + 2, y + h - 3, ink); p.put(x + ox + 1, y + 3, ink); p.put(x + ox + 3, y + 3, ink); p.put(x + ox + 2, y + 4, ink); }
      break;
    }
  }
  void blk;
}

// ---------------------------------------------------------------- objetos da praça

function squareObj(g: Ctx27, o: FosObj31, m: FosM31, fy: number): void {
  const { p, pal } = g;
  const { blk } = prim27;
  const { x, y, w, h } = o;
  const year = m.year;
  switch (o.kind) {
    case 'tree': {
      const trunk = C('#5a3a24'), leaf = pal.plant;
      const cx = x + (w >> 1);
      blk(p, cx - 3, fy - 26, 6, 26, trunk);
      p.vline(cx - 2, fy - 25, fy - 2, tint(trunk, 0.25));
      for (const [dx, dy, r] of [[0, -40, 16], [-11, -32, 11], [11, -33, 12], [-4, -52, 10], [7, -50, 9]] as const) p.disc(cx + dx, fy + dy, r, lv(leaf, 2.6));
      for (const [dx, dy, r] of [[-3, -44, 9], [-12, -34, 6], [6, -36, 7], [-6, -54, 5]] as const) p.disc(cx + dx, fy + dy, r, lv(leaf, 4));
      for (let i = 0; i < 9; i++) p.put(cx - 10 + ((i * 7) % 20), fy - 30 - ((i * 5) % 22), lv(leaf, 1.4));
      break;
    }
    case 'bench': {
      const wood = year < 1960 ? pal.wood : C('#4a7a4a');
      const iron = C('#2a2a30');
      blk(p, x, y + 4, w, 3, wood); blk(p, x, y - 4, w, 3, wood); // assento e encosto
      p.hline(x, x + w - 1, y + 4, tint(wood, 0.3));
      for (const lx of [x + 2, x + w - 4]) { p.rect(lx, y - 4, 2, 16, iron); p.rect(lx - 1, y + 10, 4, 2, iron); }
      break;
    }
    case 'plaque': {
      // pedestal de pedra com a placa de bronze
      const stone = C('#9a968e');
      blk(p, x + 2, y + 12, w - 4, h - 12, stone);
      p.vline(x + 3, y + 13, y + h - 2, tint(stone, 0.25));
      blk(p, x, y + h - 3, w, 3, tint(stone, -0.15));
      blk(p, x, y, w, 13, C('#8a5a24')); p.rect(x + 1, y + 1, w - 2, 11, C('#c8902c'));
      for (let i = 0; i < 4; i++) p.rect(x + 3, y + 3 + i * 2, w - 6 - (i % 2) * 3, 1, C('#5a3a14'));
      p.put(x + 2, y + 2, C('#f0d080'));
      break;
    }
    case 'kiosk': {
      // coreto: base, colunas finas, guarda-corpo e telhado em pagode
      const base = C('#c8c0b0'), col = C('#e8e4da'), roof = year < 1960 ? C('#5a6a4a') : C('#4a5a6a');
      blk(p, x, fy - 8, w, 8, base); p.hline(x, x + w - 1, fy - 8, tint(base, 0.3));
      for (let i = 0; i < 5; i++) p.rect(x + 2 + Math.round(((w - 6) * i) / 4), fy - 38, 2, 30, col);
      p.rect(x + 2, fy - 16, w - 4, 1, col); for (let xx = x + 4; xx < x + w - 4; xx += 3) p.vline(xx, fy - 15, fy - 9, col); // guarda-corpo
      p.poly([[x - 4, fy - 38], [x + w + 4, fy - 38], [x + w - 10, fy - 48], [x + 10, fy - 48]], roof);
      p.poly([[x + 10, fy - 48], [x + w - 10, fy - 48], [x + (w >> 1), fy - 54]], tint(roof, 0.15));
      p.hline(x - 4, x + w + 3, fy - 38, tint(roof, -0.3));
      p.rect(x + (w >> 1), fy - 57, 1, 3, pal.gold);
      break;
    }
    case 'statue': {
      // escultura discreta: um violino de bronze num pedestal baixo, no canteiro
      const stone = C('#8a8680'), bronze = C('#7a5a2a');
      blk(p, x + 1, fy - 10, w - 2, 10, stone); p.vline(x + 2, fy - 9, fy - 2, tint(stone, 0.25));
      const cx = x + (w >> 1);
      p.ellipse(cx, fy - 13, 4, 3, bronze); p.ellipse(cx, fy - 19, 3, 3, bronze); p.rect(cx, fy - 30, 1, 9, tint(bronze, -0.2)); p.rect(cx - 1, fy - 31, 3, 2, bronze);
      p.put(cx - 2, fy - 20, tint(bronze, 0.5));
      for (let i = 0; i < 5; i++) p.put(x - 2 + i * 4, fy - 1, [C('#d8402a'), C('#e8c040'), C('#d870a0')][i % 3]); // flores
      break;
    }
  }
}

// ---------------------------------------------------------------- gente

function drawPeople(ctx: CanvasRenderingContext2D, m: FosM31, X: (f: number) => number, fy: number, real?: (id: string) => Appearance | undefined, role?: (p: FosWho31) => string | null | undefined): void {
  for (const who of [...m.people].sort((a, b) => a.x - b.x)) {
    const fx = X(who.x);
    const look = fosLook31(who, real);
    const a = avatarSprite(look, { year: m.year, role: (role?.(who) ?? null) as Parameters<typeof avatarSprite>[1]['role'], pose: who.pose as Pose, dir: who.dir });
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(fx - 6, fy, 12, 1);
    ctx.drawImage(a.c, fx - a.ax, fy - a.ay + 1 + (who.pose === 'sit' ? -2 : 0));
    if (who.you) { ctx.fillStyle = '#ffe070'; ctx.fillRect(fx - 1, fy - 38, 3, 3); ctx.fillStyle = '#1a1214'; ctx.fillRect(fx, fy - 37, 1, 1); }
  }
}

export interface FosDrawOpts31 { name?: string; real?: (id: string) => Appearance | undefined; role?: (p: FosWho31) => string | null | undefined }

/** A casa: corte de interior da época (moldura, parede, luz) com os objetos da família e as pessoas. */
export function drawFosHome31(canvas: HTMLCanvasElement, m: FosM31, o: FosDrawOpts31 = {}): void {
  const W = m.W, H = m.H, year = m.year;
  const seed = hs(`${m.seed}|fos31home|${m.city}`);
  const c = ctxFor(W, year, seed, false);
  const { g, x0, w0, y0, fy, gy, bx, bw, top } = c;
  let p = g.p;
  prim27.sky(g); prim27.neighbours(g); prim27.street(g);
  prim27.wallFill(g, c.pl.cells[0]);
  const back = p, layer = new Px(W, H);
  p = layer; g.p = layer;
  // tapete e um rádio/TV da época no canto da sala (decoração, sem clique)
  layer.rect(x0 + Math.round(w0 * 0.15), fy - 1, Math.round(w0 * 0.2), 2, tint(g.pal.fabric, -0.1));
  for (const ob of m.objs) homeObj(g, ob, m, fy);
  prim27.plant(g, x0 + Math.round(w0 * 0.455), fy, true);
  layer.outline(INK);
  p = back; g.p = back;
  p.blit(layer, 0, 0);
  // moldura: casa de família (reboco claro antes de 1960, pastilha depois), telhado de telhas
  const fc = year < 1930 ? C('#c8a080') : year < 1960 ? C('#e0d4b8') : year < 1990 ? C('#d8c8a8') : C('#e8e0d0');
  const { blk } = prim27;
  blk(p, bx, top, OW, gy - top, fc); blk(p, bx + bw - OW, top, OW, gy - top, tint(fc, -0.18));
  blk(p, bx, top, bw, y0 - top, tint(fc, 0.06));
  const tile = C('#a8482a');
  p.poly([[bx - 6, top + 1], [bx + bw + 6, top + 1], [bx + bw - 30, top - 12], [bx + 30, top - 12]], tile);
  for (let xx = bx; xx < bx + bw; xx += 4) p.vline(xx, top - 10, top, tint(tile, -0.2));
  blk(p, bx, gy - FOUND, bw, FOUND, tint(fc, -0.35));
  if (o.name) prim27.sign(g, Math.round(W / 2), top + 2, o.name, Math.min(bw - 20, 200), year >= 1925);
  for (let i = 0; i < 3; i++) prim27.lamp(g, x0 + Math.round((w0 * (i + 0.5)) / 3), y0, fy, 26);
  for (let i = 0; i < 3; i++) { p.rect(x0 + i, y0, 1, RH, withAlpha(OCC, 90 - i * 28)); p.rect(x0 + w0 - 1 - i, y0, 1, RH, withAlpha(OCC, 80 - i * 25)); }
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(W, H);
  new Uint32Array(img.data.buffer).set(p.d);
  ctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const gg = geom27(W);
  drawPeople(ctx, m, gg.X, gg.fy, o.real, o.role);
}

/** A praça: céu e vizinhos da época, calçada de pedra portuguesa, os objetos e as pessoas. */
export function drawFosSquare31(canvas: HTMLCanvasElement, m: FosM31, o: FosDrawOpts31 = {}): void {
  const W = m.W, H = m.H, year = m.year;
  const seed = hs(`${m.seed}|fos31sq|${m.city}`);
  const c = ctxFor(W, year, seed, false, true);
  const { g, gy } = c;
  let p = g.p;
  prim27.sky(g); prim27.neighbours(g);
  // gramado e calçada da praça (ondas de pedra portuguesa em dois tons)
  const grass = mix(g.pal.plant, C('#2a3a24'), 0.4);
  p.rect(0, gy - 22, W, 22, grass);
  for (let xx = 0; xx < W; xx += 3) p.put(xx, gy - 22 + ((xx * 7) % 3), lv(grass, 3.4));
  const pave = C('#d8d0c0'), pave2 = C('#3a3a40');
  for (let yy = gy - 6; yy < gy; yy++) for (let xx = 0; xx < W; xx++) p.put(xx, yy, Math.sin((xx + yy * 3) / 6) > 0.55 ? pave2 : pave);
  prim27.street(g);
  const fy = gy - 2;
  const back = p, layer = new Px(W, H);
  p = layer; g.p = layer;
  for (const ob of m.objs) squareObj(g, ob, m, fy);
  layer.outline(INK);
  p = back; g.p = back;
  p.blit(layer, 0, 0);
  if (o.name) prim27.sign(g, Math.round(W / 2), 8, o.name, Math.min(W - 40, 240), year >= 1925);
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(W, H);
  new Uint32Array(img.data.buffer).set(p.d);
  ctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawPeople(ctx, m, (f) => Math.round(12 + f * (W - 24)), fy, o.real, o.role);
}

export type { Col };
